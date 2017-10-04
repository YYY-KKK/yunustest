import { db, memDb } from './db';

var cleanupIntervalId;

async function cleanupActors() {
    let actors = await memDb.getActorsByTypeAndTags();

    for (let actor of actors) {
        // TODO: Implement unannounce API and increase this timeout
        // Delete actors that are not assigned to a session and have
        // not been seen for a while
        if (!actor.testSessionId && (Date.now() - actor.lastSeenTime > 8 * 1000)) {
            await memDb.deleteActor(actor.id);
        }
    }
}

export function startCleanupInterval() {
    cleanupIntervalId = setInterval(cleanupActors, 5000);
}

export function stopCleanupInterval() {
    clearInterval(cleanupIntervalId);
}