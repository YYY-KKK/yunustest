import * as dbManager from './db-manager';
import { ActorGroup, TestActor } from './types';
import * as notifier from './websocket-notifier';

var cleanupIntervalId;

async function cleanupActors() {
    const db = dbManager.getDb();
    let actors = await db.getActorsByTypeAndTags();

    for (let actor of actors) {
        // TODO: Implement unannounce API and increase this timeout
        // Delete actors that are not assigned to a session and have
        // not been seen for a while
        if (!actor.testSessionId && (Date.now() - actor.lastSeenTime > 8 * 1000)) {
            await db.deleteActor(actor.id);
            notifier.onActorsChanged(actor.id);
        }
    }
}

/** Returns all the test actors from a collection whose tags conform to the
 * specified expression, for example "(tag1 || tag2) && tag3". */
export function getActorsByTagPredicate(allActors: TestActor[], tagPredicate: string): TestActor[] {
    const results: TestActor[] = [];

    for (let actor of allActors) {
        const currentPredicate = tagPredicate.replace(/[\w\-+\[\].\/]+/g, function (match) {
            return hasTag(actor, match) ? 'true' : 'false';
        });

        try {
            if (eval(currentPredicate)) {
                results.push(actor);
            }
        } catch (err) {
            console.log(`ERROR: Failed to evaluate expression "${tagPredicate}" while selecting tests by tags. The error message was: ${err.message}. Please review the expression and correct it.`);
            break;
        }
    }

    return results;
}

/** Returns all actors from the set provided that are in the specified group. */
export function getActorsInGroup(allActors: TestActor[], group: ActorGroup): TestActor[] {
    return getActorsByTagPredicate(allActors, group.actorTags);
}

/** Returns true if an actor has the specified tag and false otherwise. */
export function hasTag(actor: TestActor, requiredTag: string): boolean {
    let tagWasFound = false;
    for (let testTag of actor.tags || []) {
        if (testTag === requiredTag) {
            tagWasFound = true;
            break;
        }
    }

    return tagWasFound;
}

export function isActorInGroup(actor: TestActor, group: ActorGroup) {
    const actors = getActorsByTagPredicate([actor], group.actorTags);
    return actors && actors.length === 1;
}

export function startCleanupInterval() {
    cleanupIntervalId = setInterval(cleanupActors, 5000);
}

export function stopCleanupInterval() {
    clearInterval(cleanupIntervalId);
}