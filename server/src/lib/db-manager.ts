import * as configLoader from '../lib/config-loader';
import * as helpers from '../lib/helpers';
import { DbAdapter } from './types';
import { NedbAdapter } from './nedb-adapter'

export interface DbOptions {
    adapter?: 'nedb' | 'mongodb'
}

let db: DbAdapter = null;

export function getDb() {
    return db;
}

export function initDb() {
    const config = configLoader.getConfig();
    const dbAdapter = config.dbAdapter || 'nedb';

    if (dbAdapter === 'nedb') {
        db = new NedbAdapter();
        db.initDb();
    } else {
        throw new Error(helpers.format(
            'Unknown database adapter: "{0}". Check the "dbAdapter" parameter in your configuration file',
            dbAdapter));
    }
}