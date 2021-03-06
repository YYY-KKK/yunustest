import * as dirs from './dirs';
import * as configLoader from '../lib/config-loader';
import * as constants from './constants';
import {
    ActorSessionState,
    DbAdapter,
    QueryOptions,
    SegmentUpdateInfo,
    TestActor,
    TestSessionInfo
} from './types';
import * as helpers from './helpers';
import * as mkdirp from 'mkdirp';
import * as moment from 'moment';
import * as NeDBDatastore from 'nedb';
import * as path from 'path';
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

export class NedbAdapter implements DbAdapter {
    private actorsCol: Nedb;
    private sessionsCol: Nedb;
    private options: NeDbOptions;
    private usersCol: Nedb;

    constructor(options?: NeDbOptions) {
        this.options = options || {};
        this.options.nedbPath = this.options.nedbPath || path.join(dirs.workingDir(), 'db');
    }

    closeDb() {
        this.sessionsCol.persistence.stopAutocompaction();
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

    async deleteSession(sessionId: number): Promise<number> {
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

    async getActor(actorId): Promise<TestActor> {
        let self = this;

        return new Promise<TestActor>(function (resolve, reject) {
            self.actorsCol.findOne({ id: actorId }, function (err, actor: TestActor) {
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

    async getActorsByTypeAndTags(actorType?: string, actorTags?: string[]): Promise<TestActor[]> {
        let self = this;

        return new Promise<TestActor[]>(function (resolve, reject) {
            let query: any = {};

            if (actorType) {
                query.type = actorType
            }

            let requestedTags = actorTags || [];

            // Trim tags and remove empty ones
            requestedTags = requestedTags
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);

            self.actorsCol.find(query, function (err, actors: TestActor[]) {
                if (err) {
                    reject(err);
                } else {
                    const actorsWithTags = actors.filter(function (actor) {
                        const actorTagRegex = /^((.+?)\s*:\s*)?([\w\-+\[\].\/]+)$/;
                        let hasAllTags = true;
                        for (let requestedTag of requestedTags) {
                            const tagMatch = actorTagRegex.exec(requestedTag);
                            if (tagMatch) {
                                const actorType = tagMatch[2];
                                const tag = tagMatch[3];

                                const actorTypeMatches = !actorType || (actor.type.toLowerCase() === actorType.toLowerCase());
                                const tagExists = actor.tags.indexOf(tag) >= 0;

                                if (actorTypeMatches && !tagExists) {
                                    hasAllTags = false;
                                    break;
                                }
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
            self.sessionsCol.findOne({ id: sessionId }, function (err, actor: TestSessionInfo) {
                if (err) {
                    reject(err);
                } else {
                    resolve(actor);
                }
            });
        });
    }

    async getSession(sessionId: number): Promise<TestSessionInfo> {
        let self = this;

        return new Promise<TestSessionInfo>(function (resolve, reject) {
            self.sessionsCol.findOne({ id: sessionId }, function (err, session: TestSessionInfo) {
                if (err) {
                    reject(err);
                } else {
                    resolve(session);
                }
            });
        });
    }

    async getArchivedSessions(): Promise<TestSessionInfo[]> { return null; }

    async getSessions(options: QueryOptions = {}): Promise<TestSessionInfo[]> {
        var self = this;

        return new Promise<TestSessionInfo[]>(function (resolve, reject) {
            var cursor: Nedb.Cursor<any> = self.sessionsCol
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

    initDb() {
        const config = configLoader.getConfig();
        const dbCompactionIntervalMs = Math.min(config.dbCompactionIntervalSec * 1000, 10 * 60 * 1000);

        mkdirp.sync(this.options.nedbPath);

        this.actorsCol = new NeDBDatastore({ filename: path.join(this.options.nedbPath, 'actors'), autoload: true });
        this.sessionsCol = new NeDBDatastore({ filename: path.join(this.options.nedbPath, 'sessions'), autoload: true });
        this.sessionsCol.persistence.setAutocompactionInterval(dbCompactionIntervalMs);
        this.usersCol = new NeDBDatastore({ filename: path.join(this.options.nedbPath, 'users'), autoload: true });
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

    async insertSession(sessionId: number, label: string): Promise<TestSessionInfo> {
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
                        timeCreated: Date.now(),
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

    async resetDb() {
        let self = this;

        await self.actorsCol.remove({}, { multi: true });
        await self.actorsCol.persistence.compactDatafile();
        await self.sessionsCol.remove({}, { multi: true });
        await self.sessionsCol.persistence.compactDatafile();
        await self.usersCol.remove({}, { multi: true });
        await self.usersCol.persistence.compactDatafile();
    }

    async updateActorSegment(
        sessionId: number,
        actorId: number,
        testIndex: number,
        segmentIndex: number,
        newData: SegmentUpdateInfo) {

        const self = this;
        const now = Date.now();
        const sessionHelper = require('../lib/session-helper');

        const testSession = await this.getSession(sessionId);

        if (!testSession) {
            throw new Error(util.format('Session ID %s was not found', sessionId));
        }

        testSession.lastActivity = now;

        const sessionActor: ActorSessionState = testSession.actors[actorId];
        // Print update requests at the console for troubleshooting purposes
        // console.log(`${sessionActor.type}, TS${testIndex}, SEG${segmentIndex}, ${JSON.stringify(newData)}`);

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

                    // Remove this block once support for the "step"
                    // terminology is completely abandoned
                    if (action.step) {
                        if (!action.segment) {
                            action.segment = action.step;
                        }
                        delete action.step;
                    }

                    action.args = helpers.escape$Properties(action.args);
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

        await self.updateSession(sessionId, testSession);
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

    async updateSession(sessionId, newData: Object): Promise<number> {
        let self = this;

        sessionId = parseInt(sessionId);

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
}