import * as assert from 'assert';
var async = require('async');
var server = require('../../lib/app').default;
var configLoader = require('../../lib/configLoader');
import { db, memDb, initDb } from '../../lib/db';
var supertest = require('supertest');

let request = supertest(server);
let actorInfo1 = { actorId: 123, actorType: "ACTOR1" };
let actorInfo2 = { actorId: 456, actorType: "ACTOR2" };
let sessionId01, sessionId02;

describe('API', function () {
    before(function () {
        // Set the acquireActorsTimeoutSec parameter to a really low value to
        // test the session cancellation logic in the next test
        configLoader.loadConfig({
            acquireActorsTimeoutSec: 1
        });

        initDb();
    });

    // POST /api/actor/announce
    it('should announce ACTOR1', function (done) {
        request.post("/api/actor/announce")
            .send(actorInfo1)
            .expect(200)
            .end(async function (err, res) {
                if (err) done(err);

                let actor = await memDb.getActor(actorInfo1.actorId);
                assert.equal(actor.type, actorInfo1.actorType);

                done();
            });
    });

    // POST /api/session
    it('should create test session without the necessary actors', function (done) {
        request.post("/api/session")
            .send({
                tests: [{
                    actors: [actorInfo1.actorType, actorInfo2.actorType],
                    hash: '123456789',
                    name: 'test01',
                    path: 'dir01',
                    steps: [1, 2]
                }]
            })
            .expect(200)
            .end(async function (err, res) {
                if (err) done();

                let session = await memDb.getMemSession(res.body.sessionId);

                // Store session ID, to be used in subsequent tests
                sessionId01 = session.id;

                // TODO: Validate additional session detail
                assert.equal(session.id, res.body.sessionId);
                assert.equal(session.status, 'acquiring-actors');
                assert.equal(session.result, 'pending');

                done();
            });
    });

    // GET /session/:sessionId/status
    it('should cancel session missing the necessary actors', function (done) {
        var startTime = Date.now();
        var maxTimeoutSec = 4;
        var intervalId = setInterval(checkSessionStatus, 500);

        this.slow(3000);
        this.timeout((maxTimeoutSec + 1) * 1000);

        function checkSessionStatus() {
            if (Date.now() - startTime < maxTimeoutSec * 1000) {
                request.get(`/api/session/${sessionId01}/status`)
                    .expect(200)
                    .end(function (err, res) {
                        if (res.body.result === 'cancelled') {
                            clearInterval(intervalId);
                            done();
                        }
                    });
            } else {
                clearInterval(intervalId);
                done(new Error(`A test session missing the necessary actors was not cancelled in due time.`));
            }
        }
    });

    // POST /api/session
    it('should create test session 02', function (done) {
        this.slow(2000);
        this.timeout(5000);

        request.post("/api/session")
            .send({
                tests: [{
                    actors: ['ACTOR1', 'ACTOR2'],
                    hash: '123456789',
                    name: 'test01',
                    path: 'dir01',
                    steps: [1, 2]
                }]
            })
            .expect(200)
            .end(async function (err, res) {
                if (err) done();

                var session = await memDb.getMemSession(res.body.sessionId);

                // Store session ID, to be used in subsequent tests
                sessionId02 = session.id;

                // TODO: Validate additional session detail
                assert.equal(session.id, res.body.sessionId);
                assert.equal(session.status, 'acquiring-actors');
                assert.equal(session.result, 'pending');

                done();
            });
    });

    // GET /session/:sessionId/status
    it('should verify status "acquiring-actors" for session 02', function (done) {
        request.get(`/api/session/${sessionId02}/status`)
            .expect(200)
            .end(function (err, res) {
                if (err) done(err);

                assert.equal(res.body.status, 'acquiring-actors');

                done();
            });
    });

    // POST /api/actor/announce
    it('should announce ACTOR1 and ACTOR2', function (done) {
        async.parallel([
            function (callback) {
                request.post("/api/actor/announce")
                    .send({
                        actorId: "ACTOR1_S02",
                        actorType: "ACTOR1"
                    })
                    .expect(200)
                    .end(async function (err, res) {
                        if (err) callback(err);

                        var actor = await memDb.getActor("ACTOR1_S02");
                        if (actor.type !== 'ACTOR1') {
                            callback(new Error("Failed to create ACTOR1_S02"));
                        } else {
                            callback();
                        }
                    });
            },

            function (callback) {
                request.post("/api/actor/announce")
                    .send({
                        actorId: "ACTOR2_S02",
                        actorType: "ACTOR2"
                    })
                    .expect(200)
                    .end(async function (err, res) {
                        if (err) callback(err);

                        var actor = await memDb.getActor("ACTOR2_S02");
                        if (actor.type !== 'ACTOR2') {
                            callback(new Error("Failed to create ACTOR1_S02"));
                        } else {
                            callback();
                        }
                    });
            }],

            function (err) {
                done(err);
            }
        );
    });

    // GET /session/:sessionId/status
    it('should verify status "started" for session 02', function (done) {
        var startTime = Date.now();
        var maxTimeoutSec = 10;
        var intervalId = setInterval(checkSessionStatus, 500);

        this.slow(3000);
        this.timeout((maxTimeoutSec + 1) * 1000);

        function checkSessionStatus() {
            if (Date.now() - startTime < maxTimeoutSec * 1000) {
                request.get(`/api/session/${sessionId02}/status`)
                    .expect(200)
                    .end(function (err, res) {
                        if (res.body.status === 'started') {
                            clearInterval(intervalId);
                            done();
                        }
                    });
            } else {
                clearInterval(intervalId);
                done(new Error('Test session 02 was not started in due time.'));
            }
        }
    });

    // GET /api/actors
    it('should return all actors', function (done) {
        request.get("/api/actors")
            .expect(200)
            .end(function (err, res) {
                if (err) done(err);

                var actors = res.body;
                assert.equal(actors.length, 3);

                done();
            });
    });

    // GET /api/reset
    it('should reset database', function (done) {
        request.get("/api/reset")
            .expect(200)
            .end(async function (err, res) {
                if (err) done(err);

                var actor = await memDb.getActor(123);
                assert(typeof actor === 'undefined');

                done();
            });
    });
});