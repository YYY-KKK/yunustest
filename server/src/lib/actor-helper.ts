import * as dbManager from './db-manager';
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

export function startCleanupInterval() {
    cleanupIntervalId = setInterval(cleanupActors, 5000);
}

export function stopCleanupInterval() {
    clearInterval(cleanupIntervalId);
}