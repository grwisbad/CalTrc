/**
 * DB Store — CALTRC
 *
 * Persists food log entries to a PostgreSQL database.
 * Used when DATABASE_URL is configured.
 */

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    // This module should only be required when DATABASE_URL is set.
    throw new Error('DATABASE_URL is not set. DB store cannot be used without a database connection string.');
}

const pool = new Pool({
    connectionString,
    ssl: process.env.PGSSLMODE === 'disable'
        ? false
        : { rejectUnauthorized: false },
});

let schemaEnsured = false;

async function ensureSchema() {
    if (schemaEnsured) return;

    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS food_entries (
            id TEXT PRIMARY KEY,
            date DATE NOT NULL,
            name TEXT NOT NULL,
            calories INTEGER NOT NULL DEFAULT 0,
            protein NUMERIC(10, 1) NOT NULL DEFAULT 0,
            carbs NUMERIC(10, 1) NOT NULL DEFAULT 0,
            fat NUMERIC(10, 1) NOT NULL DEFAULT 0,
            logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `;

    await pool.query(createTableSQL);
    schemaEnsured = true;
}

/**
 * Load all entries, optionally filtered by date (YYYY-MM-DD).
 * @param {string} [date]
 * @returns {Promise<Object[]>}
 */
async function loadEntries(date) {
    await ensureSchema();

    const params = [];
    let whereClause = '';

    if (date) {
        whereClause = 'WHERE date = $1';
        params.push(date);
    }

    const result = await pool.query(
        `
        SELECT
            id,
            to_char(date, 'YYYY-MM-DD') AS date,
            name,
            calories,
            protein,
            carbs,
            fat,
            logged_at
        FROM food_entries
        ${whereClause}
        ORDER BY logged_at ASC;
        `,
        params
    );

    return result.rows.map((row) => ({
        id: row.id,
        date: row.date,
        name: row.name,
        calories: Number(row.calories) || 0,
        protein: Number(row.protein) || 0,
        carbs: Number(row.carbs) || 0,
        fat: Number(row.fat) || 0,
        loggedAt: row.logged_at instanceof Date
            ? row.logged_at.toISOString()
            : String(row.logged_at),
    }));
}

/**
 * Append a food entry to the database.
 * @param {Object} entry - { id, date, name, calories, protein, carbs, fat, loggedAt }
 */
async function appendEntry(entry) {
    await ensureSchema();

    const sql = `
        INSERT INTO food_entries (
            id,
            date,
            name,
            calories,
            protein,
            carbs,
            fat,
            logged_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING;
    `;

    const params = [
        entry.id,
        entry.date,
        entry.name,
        Number(entry.calories) || 0,
        Number(entry.protein) || 0,
        Number(entry.carbs) || 0,
        Number(entry.fat) || 0,
        entry.loggedAt,
    ];

    await pool.query(sql, params);
}

/**
 * Compute daily totals for a set of entries.
 * @param {Object[]} entries
 * @returns {{ calories: number, protein: number, carbs: number, fat: number }}
 */
function computeTotals(entries) {
    return entries.reduce(
        (t, e) => ({
            calories: t.calories + e.calories,
            protein: +(t.protein + e.protein).toFixed(1),
            carbs: +(t.carbs + e.carbs).toFixed(1),
            fat: +(t.fat + e.fat).toFixed(1),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
}

module.exports = {
    loadEntries,
    appendEntry,
    computeTotals,
};
