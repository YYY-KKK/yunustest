import * as appRoot from 'app-root-path';
import * as constants from './constants';
import {
    ActorSessionState,
    MemDbAdapter,
    PersistentDbAdapter,
    QueryOptions,
    SessionTemplate,
    SegmentUpdateInfo,
    TestActor,
    TestSessionInfo
} from './types';
import * as helpers from './helpers';
import * as mkdirp from 'mkdirp';
import * as moment from 'moment';
import * as NeDBDatastore from 'nedb';
import * as nedbTypes from 'nedbTypes';
import * as path from 'path';
import * as sessionHelper from '../lib/session-helper';
import * as thenify from 'thenify';
import * as util from 'util';

export interface NeDbOptions {
    nedbPath?: string
}

export interface DbQueryOptions {
    limit?: number,
    query?: any,
    skip?: number
}

export class NedbAdapter implements MemDbAdapter, PersistentDbAdapter {
    private actorsCol: nedbTypes.DataStore;
    private memSessionsCol: nedbTypes.DataStore;
    private sessionsCol: nedbTypes.DataStore;
    private options: NeDbOptions;
    private sessionTemplatesCol: nedbTypes.DataStore;
    private usersCol: nedbTypes.DataStore;

    constructor(options?: NeDbOptions) {
        this.options = options || {};
        this.options.nedbPath = this.options.nedbPath || path.join(appRoot.path, 'db');
    }

    async deleteActor(actorId: number): Promise<number> {
        let self = this;

        return new Promise<number>(function (resolve, reject) {
            self.actorsCol.remove({ id: actorId }, {}, function (err, numRemoved) {
                if (err) {
                    reject(err);
                } else {
                    resolve(numRemoved);
                }
            });
        });
    }

    async deleteArchivedSession(sessionId: number): Promise<number> {
        let self = this;

        return new Promise<number>(function (resolve, reject) {
            self.sessionsCol.remove({ id: sessionId }, {}, function (err, numRemoved) {
                if (err) {
                    reject(err);
                } else {
                    resolve(numRemoved);
                }
            });
        });
    }

    async deleteMemSession(sessionId: number): Promise<number> {
        let self = this;

        return new Promise<number>(function (resolve, reject) {
            self.memSessionsCol.remove({ id: sessionId }, {}, function (err, numRemoved) {
                if (err) {
                    reject(err);
                } else {
                    resolve(numRemoved);
                }
            });
        });
    }

    async getActor(actorId): Promise<TestActor> {
        let self = this;

        return new Promise<TestActor>(function (resolve, reject) {
            self.actorsCol.findOne({ id: actorId }, function (err, actor) {
                if (err) {
                    reject(err);
                } else {
                    resolve(actor);
                }
            });
        });
    }

    async getActorsBySession(sessionId): Promise<TestActor[]> {
        let self = this;

        return new Promise<TestActor[]>(function (resolve, reject) {
            let query = sessionId ? { testSessionId: sessionId } : {};
            self.actorsCol.find(query, function (err, actors) {
                if (err) {
                    reject(err);
                } else {
                    resolve(actors);
                }
            });
        });
    }

    async getActorsByType(actorType?: string, actorTags?: string[]): Promise<TestActor[]> {
        let self = this;

        return new Promise<TestActor[]>(function (resolve, reject) {
            let query: any = {};

            if (actorType) {
                query.type = actorType
            }

            actorTags = actorTags || [];

            // Remove empty tags
            actorTags = actorTags.filter((t) => t.trim().length > 0);

            self.actorsCol.find(query, function (err, actors: TestActor[]) {
                if (err) {
                    reject(err);
                } else {
                    const actorsWithTags = actors.filter(function (a) {
                        let hasAllTags = true;
                        for (let tag of actorTags) {
                            if (a.tags.indexOf(tag) == -1) {
                                hasAllTags = false;
                                break;
                            }
                        }
                        return hasAllTags;
                    });
                    resolve(actorsWithTags);
                }
            });
        });
    }

    async getArchivedSession(sessionId: number): Promise<TestSessionInfo> {
        let self = this;

        return new Promise<TestSessionInfo>(function (resolve, reject) {
            self.sessionsCol.findOne({ id: sessionId }, function (err, actor) {
                if (err) {
                    reject(err);
                } else {
                    resolve(actor);
                }
            });
        });
    }

    async getMemSession(sessionId: number): Promise<TestSessionInfo> {
        let self = this;

        return new Promise<TestSessionInfo>(function (resolve, reject) {
            self.memSessionsCol.findOne({ id: sessionId }, function (err, session) {
                if (err) {
                    reject(err);
                } else {
                    resolve(session);
                }
            });
        });
    }

    async getArchivedSessions(): Promise<TestSessionInfo[]> { return null; }

    async getMemSessions(options: QueryOptions = {}): Promise<TestSessionInfo[]> {
        var self = this;

        return new Promise<TestSessionInfo[]>(function (resolve, reject) {
            var cursor: nedbTypes.Cursor = self.memSessionsCol
                .find({})
                .sort({ timeCreated: -1 });

            if (options.limit) {
                cursor = cursor.limit(options.limit);
            }

            if (options.skip) {
                cursor = cursor.skip(options.skip);
            }

            cursor.exec(function (err, docs) {
                if (err) {
                    reject(err);
                } else {
                    resolve(docs);
                }
            });
        });
    }

    async initMemoryDb() {
        await thenify(mkdirp)(this.options.nedbPath);

        this.actorsCol = new NeDBDatastore({ filename: path.join(this.options.nedbPath, 'actors'), autoload: true });
        this.memSessionsCol = new NeDBDatastore({ filename: path.join(this.options.nedbPath, 'memSessions'), autoload: true });
    }

    async initPersistentDb() {
        await thenify(mkdirp)(this.options.nedbPath);

        this.usersCol = new NeDBDatastore({ filename: path.join(this.options.nedbPath, 'users'), autoload: true });
        this.sessionsCol = new NeDBDatastore({ filename: path.join(this.options.nedbPath, 'sessions'), autoload: true });
        this.sessionTemplatesCol = new NeDBDatastore({ filename: path.join(this.options.nedbPath, 'sessionTemplates'), autoload: true });

        // TODO: Continue session template implementation
        // let sampleTemplate: SessionTemplate = { id: 1, label: "Session 1", maxIterations: 1, tests: [{name: "", path: ""}]};
        // this.sessionTemplatesCol.insert(sampleTemplate);
    }

    async insertActor(actorId: number, actorType: string): Promise<TestActor> {
        var self = this;

        var countPromise = new Promise<number>((resolve, reject) => {
            self.actorsCol.count({ id: actorId }, function (err, recordCount) {
                if (err) {
                    reject(err);
                } else {
                    resolve(recordCount);
                }
            });
        });

        return countPromise.then(function (recordCount): Promise<TestActor> {
            if (recordCount > 0) {
                return Promise.reject(new Error(util.format(
                    'Actor ID %s already exists',
                    actorId)));
            } else {
                return new Promise<TestActor>(function (resolve, reject) {
                    let newActor: TestActor = {
                        id: actorId,
                        lastSeenTime: Date.now(),
                        testSessionId: null,
                        type: actorType,
                        tags: []
                    };

                    self.actorsCol.insert(newActor, function (err, actor) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(actor);
                        }
                    });
                });
            }
        });
    }

    async insertArchivedSession(sessionId: number, label: string): Promise<TestSessionInfo> {
        var self = this;
        let now = Date.now();

        var countPromise = new Promise<number>((resolve, reject) => {
            self.sessionsCol.count({ id: sessionId }, function (err, recordCount) {
                if (err) {
                    reject(err);
                } else {
                    resolve(recordCount);
                }
            });
        });

        return countPromise.then(function (recordCount): Promise<TestSessionInfo> {
            if (recordCount > 0) {
                return Promise.reject(new Error(util.format(
                    'Session ID %s already exists',
                    sessionId)));
            } else {
                return new Promise<TestSessionInfo>(function (resolve, reject) {
                    let newSession: TestSessionInfo = {
                        id: sessionId,
                        actors: {},
                        maxIterations: 1,
                        currentIteration: 1,
                        currentTestIndex: 0,
                        currentSegmentIndex: 0,
                        label: label,
                        result: constants.testSessionResult.PENDING,
                        status: constants.testSessionStatus.ACQUIRING_ACTORS,
                        tests: [],
                        timeCreated: now,
                        timeStarted: null,
                        timeCompleted: null,
                        lastActivity: now
                    };

                    self.sessionsCol.insert(newSession, function (err, actor) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(actor);
                        }
                    });
                });
            }
        });
    }

    async insertMemSession(sessionId: number, label: string): Promise<TestSessionInfo> {
        var self = this;
        let now = Date.now();

        var countPromise = new Promise<number>((resolve, reject) => {
            self.memSessionsCol.count({ id: sessionId }, function (err, recordCount) {
                if (err) {
                    reject(err);
                } else {
                    resolve(recordCount);
                }
            });
        });

        return countPromise.then(function (recordCount): Promise<TestSessionInfo> {
            if (recordCount > 0) {
                return Promise.reject(new Error(util.format(
                    'Session ID %s already exists',
                    sessionId)));
            } else {
                return new Promise<TestSessionInfo>(function (resolve, reject) {
                    let newSession: TestSessionInfo = {
                        id: sessionId,
                        actors: {},
                        maxIterations: 1,
                        currentIteration: 1,
                        currentTestIndex: 0,
                        currentSegmentIndex: 0,
                        label: label,
                        result: constants.testSessionResult.PENDING,
                        status: constants.testSessionStatus.ACQUIRING_ACTORS,
                        tests: [],
                        timeCreated: Date.now(),
                        timeStarted: null,
                        timeCompleted: null,
                        lastActivity: now
                    };

                    self.memSessionsCol.insert(newSession, function (err, actor) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(actor);
                        }
                    });
                });
            }
        });
    }

    async resetMemoryDb() {
        let self = this;

        await self.actorsCol.remove({}, { multi: true });
        await self.actorsCol.persistence.compactDatafile();
        await self.memSessionsCol.remove({}, { multi: true });
        await self.memSessionsCol.persistence.compactDatafile();
    }

    async resetPersistentDb() {
        let self = this;

        await self.actorsCol.remove({}, { multi: true });
        await self.actorsCol.persistence.compactDatafile();
        await self.usersCol.remove({}, { multi: true });
        await self.usersCol.persistence.compactDatafile();
        await self.sessionsCol.remove({}, { multi: true });
        await self.sessionsCol.persistence.compactDatafile();
        await self.sessionTemplatesCol.remove({}, { multi: true });
        await self.sessionTemplatesCol.persistence.compactDatafile();
    }

    async updateActorSegment(sessionId: number, actorId: number, testIndex: number, segmentIndex: number, newData: SegmentUpdateInfo) {
        let self = this;
        let now = Date.now();

        let testSession = await this.getMemSession(sessionId);

        if (!testSession) {
            throw new Error(util.format('Session ID %s was not found', sessionId));
        }

        testSession.lastActivity = now;

        let sessionActor: ActorSessionState = testSession.actors[actorId];
        // Print update requests at the console for troubleshooting purposes
        console.log("*** sessionId", sessionId, " actor", sessionActor.type, " testIndex", testIndex, " segmentIndex", segmentIndex, " newData", newData);

        if (!sessionActor) {
            throw new Error(util.format('Session actor with ID %s was not found for session %s', actorId, sessionId));
        }

        // Make sure testIndex is integer
        let testIndexInt = parseInt(testIndex as any);
        if (!Number.isInteger(testIndexInt)) {
            throw new Error(helpers.format(
                "Method updateActorSegment was called with an invalid testIndex parameter. The value received was {0}",
                testIndex));
        }
        testIndex = testIndexInt;

        if (newData.actions) {
            if (Array.isArray(newData.actions)) {
                for (let action of newData.actions) {
                    if (action.duration && !action.durationMs) {
                        action.durationMs = action.duration * 1000;
                    }

                    // Remove this block one support for the "step"
                    // terminology is completely abandoned
                    if (action.step) {
                        if (!action.segment) {
                            action.segment = action.step;
                        }
                        delete action.step;
                    }
                }
            }
            testSession.tests[testIndex].actions = testSession.tests[testIndex].actions || [];
            testSession.tests[testIndex].actions = testSession.tests[testIndex].actions.concat(newData.actions);
        }

        // In segment 0 of data-driven tests, actors report the total number of
        // data records available. We store that number in the test context so
        // we know how many iterations to process.
        if (newData.dataRecordCount) {
            if (!Number.isInteger(newData.dataRecordCount)) {
                throw new Error(helpers.format(
                    "The dataRecordCount field must be an integer. The value received was {0}.",
                    newData.dataRecordCount));
            }

            // The dataRecordCount field will only be sent by actors in segment 0 of data-driven tests
            if (testSession.tests[testIndex].currentSegmentIndex == 0) {
                testSession.tests[testIndex].dataRecordCount = newData.dataRecordCount;
                testSession.tests[testIndex].currentSegmentIndex = 1;
            }
        }

        if (newData.stackTrace) {
            testSession.actors[actorId].tests[testIndex].segments[segmentIndex].stackTrace = newData.stackTrace;
        }

        if (newData.status) {
            sessionHelper.updateActorSegmentStatus(testSession, actorId, testIndex, segmentIndex, newData.status);
        }

        if (newData.result) {
            testSession.actors[actorId].tests[testIndex].segments[segmentIndex].result = newData.result;
        }

        sessionHelper.updateSessionState(testSession);

        await self.updateMemSession(sessionId, testSession);
    }

    async updateActor(actorId, newData): Promise<number> {
        let self = this;

        actorId = parseInt(actorId);

        return new Promise<number>(function (resolve, reject) {
            self.actorsCol.update({ id: actorId }, { $set: newData }, {}, function (err, numUpdated) {
                if (err) {
                    reject(err);
                } else {
                    resolve(numUpdated);
                }
            });
        });
    }

    async updateArchivedSession(sessionId: number, newData: Object): Promise<number> {
        let self = this;

        return new Promise<number>(function (resolve, reject) {
            self.sessionsCol.update({ id: sessionId }, { $set: newData }, {}, function (err, numUpdated) {
                if (err) {
                    reject(err);
                } else {
                    resolve(numUpdated);
                }
            });
        });
    }

    async updateMemSession(sessionId, newData: Object): Promise<number> {
        let self = this;

        sessionId = parseInt(sessionId);

        return new Promise<number>(function (resolve, reject) {
            self.memSessionsCol.update({ id: sessionId }, { $set: newData }, {}, function (err, numUpdated) {
                if (err) {
                    reject(err);
                } else {
                    resolve(numUpdated);
                }
            });
        });
    }
}