import * as configLoader from '../lib/configLoader';
import * as helpers from '../lib/helpers';
import { MemDbAdapter, PersistentDbAdapter } from './dbTypes';
import { NedbAdapter } from './nedbAdapter'

export interface DbOptions {
    adapter?: 'nedb' | 'mongodb'
}

export let memDb: MemDbAdapter;
export let db: PersistentDbAdapter;

export function initDb() {
    let config = configLoader.getConfig();
    let dbAdapter = config.dbAdapter || 'nedb';

    if (dbAdapter === 'nedb') {
        let nedbAdapter = new NedbAdapter();

        memDb = nedbAdapter;
        memDb.initMemoryDb();

        db = nedbAdapter;
        db.initPersistentDb();
    } else {
        throw new Error(helpers.format(
            'Unknown database adapter: "{0}". Check the "dbAdapter" parameter in your configuration file',
            dbAdapter));
    }
}