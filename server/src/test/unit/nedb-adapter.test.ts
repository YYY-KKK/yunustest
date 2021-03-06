import * as assert from 'assert';
import * as configLoader from '../../lib/config-loader';
import * as helpers from '../../lib/helpers';
import { NedbAdapter } from '../../lib/nedb-adapter';
import * as tempModule from 'temp';

let temp = tempModule.track(true);

describe('nedb-adapter module', function () {
    var db: NedbAdapter;

    let dbDirPath;
    let actorId = 123;
    let testSessionId = 1234;

    before(function (done) {
        temp.mkdir('opentest-db', function (err, dirPath) {
            if (err) done(err);

            dbDirPath = dirPath;
            done();
        });
    });

    after(function () {
        db.closeDb();
        temp.cleanupSync();
    });

    it('should init DB', function (done) {
        db = new NedbAdapter();
        Promise.all([
            db.initDb(),
        ])
            .then(function () {
                done();
            }).catch(function (err) {
                done(err);
            });
    });

    it('should reset DB initially', function (done) {
        Promise.all([
            db.resetDb(),
        ])
            .then(function () {
                done();
            }).catch(function (err) {
                done(err);
            })
    });

    // ACTOR
    it('should insert actor', function (done) {
        db.insertActor(actorId, 'ACTOR1').then(function () {
            done();
        }).catch(function (err) {
            done(err);
        });
    });

    it('should return actor', function (done) {
        db.getActor(actorId).then(function (actor) {
            if (actor.id == actorId && actor.testSessionId === null) {
                done();
            } else {
                done(new Error(helpers.format(
                    'Expected an actor with ID {0} and test session null, but received {1}',
                    actorId,
                    actor)));
            }
        }).catch(function (err) {
            done(err);
        });
    });

    it('should update actor', function (done) {
        db.updateActor(actorId, { testSessionId: testSessionId }).then(function () {
            done();
        }).catch(function (err) {
            done(err);
        });
    });

    it('should return updated actor', function (done) {
        db.getActor(actorId).then(function (actor) {
            if (actor.id == actorId && actor.testSessionId == testSessionId) {
                done();
            } else {
                done(new Error(helpers.format(
                    'Expected an actor with ID {0} and test session {1}, but received {2}',
                    actorId,
                    testSessionId,
                    actor)));
            }
        }).catch(function (err) {
            done(err);
        });
    });

    it('should delete actor', function (done) {
        db.deleteActor(actorId).then(function () {
            done();
        }).catch(function (err) {
            done(err);
        });
    });

    it('should not find actor', function (done) {
        db.getActor(actorId).then(function (actor) {
            if (actor === null) {
                done();
            } else {
                done(new Error(helpers.format(
                    'Expected actor with ID {0} to be removed, but it\'s still there',
                    actorId)));
            }
        }).catch(function (err) {
            done(err);
        });
    });

    // MEMORY SESSION
    it('should insert session', function (done) {
        db.insertSession(testSessionId, 'SESSION1').then(function () {
            done();
        }).catch(function (err) {
            done(err);
        });
    });

    it('should return session', function (done) {
        db.getSession(testSessionId).then(function (session) {
            if (session && session.id == testSessionId && session.status === 'acquiring-actors') {
                done();
            } else {
                done(new Error(helpers.format(
                    'Expected a session with ID {0} and status "acquiring-actors", but received {1}',
                    actorId,
                    session)));
            }
        }).catch(function (err) {
            done(err);
        });
    });

    it('should update session', function (done) {
        db.updateSession(testSessionId, { status: 'started' }).then(function () {
            done();
        }).catch(function (err) {
            done(err);
        });
    });

    it('should return updated session', function (done) {
        db.getSession(testSessionId).then(function (session) {
            if (session && session.id == testSessionId && session.status === 'started') {
                done();
            } else {
                done(new Error(helpers.format(
                    'Expected a session with ID {0} and status "started", but received {1}',
                    actorId,
                    session)));
            }
        }).catch(function (err) {
            done(err);
        });
    });

    it('should delete session', function (done) {
        db.deleteSession(testSessionId).then(function () {
            done();
        }).catch(function (err) {
            done(err);
        });
    });

    it('should not find session', function (done) {
        db.getSession(testSessionId).then(function (session) {
            if (session === null) {
                done();
            } else {
                done(new Error(helpers.format(
                    'Expected session with ID {0} to be removed, but it\'s still there',
                    actorId)));
            }
        }).catch(function (err) {
            done(err);
        });
    });
});