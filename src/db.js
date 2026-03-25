require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.warn(
        '[db] DATABASE_URL is not set. Database features will be disabled until it is configured.'
    );
}

const pool =
    connectionString
        ? new Pool({
              connectionString,
              ssl:
                  process.env.PGSSL === 'disable'
                      ? false
                      : {
                            rejectUnauthorized: false,
                        },
          })
        : null;

async function initSchema() {
    if (!pool) return;

    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS food_entries (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            name TEXT NOT NULL,
            calories INTEGER NOT NULL DEFAULT 0,
            protein REAL NOT NULL DEFAULT 0,
            carbs REAL NOT NULL DEFAULT 0,
            fat REAL NOT NULL DEFAULT 0,
            logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS surveys (
            id TEXT PRIMARY KEY,
            user_id TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            answers JSONB NOT NULL,
            completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS goals (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            target_calories INTEGER NOT NULL,
            target_protein REAL NOT NULL DEFAULT 0,
            target_carbs REAL NOT NULL DEFAULT 0,
            target_fat REAL NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(user_id, date)
        );
    `);
}

module.exports = {
    pool,
    initSchema,
};

