'use strict';

/*
 * Database bootstrap.
 * - Opens data/netforge.db (created if missing)
 * - Executes schema.sql (idempotent - all DDL uses IF NOT EXISTS)
 * - Seeds curriculum data only when the modules table is empty
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'netforge.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schemaPath = path.join(__dirname, 'schema.sql');
db.exec(fs.readFileSync(schemaPath, 'utf8'));

const moduleCount = db.prepare('SELECT COUNT(*) AS n FROM modules').get().n;
if (moduleCount === 0) {
  // eslint-disable-next-line global-require
  require('./seed.js')(db);
}

module.exports = db;