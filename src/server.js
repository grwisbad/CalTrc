/**
 * Express Server — CALTRC
 *
 * Serves the frontend and provides API routes for food logging.
 */

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { searchFood, generateId } = require('./foodLogger');
const { pool, initSchema } = require('./db');
const DataStore = require('./dataStore');

const app = express();
const PORT = process.env.PORT || 3000;

// Shared auth state
const store = new DataStore();
const tokens = new Map(); // token → userId

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- Auth Routes ---

/**
 * POST /api/auth/signup
 * Body: { name, email, password }
 */
app.post('/api/auth/signup', (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check duplicate email
    if (!pool) {
        // Fallback to in-memory store
        const existingUser = store.findUserByEmail(trimmedEmail);
        if (existingUser) {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }
        
        const salt = crypto.randomBytes(16).toString('hex');
        const hashedPassword = crypto.scryptSync(password, salt, 64).toString('hex');
        
        const user = {
            id: generateId(),
            name: name.trim(),
            email: trimmedEmail,
            password: `${salt}:${hashedPassword}`
        };
        
        store.saveUser(user);
        
        const token = crypto.randomBytes(24).toString('hex');
        tokens.set(token, user.id);
        
        return res.status(201).json({
            token,
            user: { id: user.id, name: user.name, email: user.email },
        });
    }

    pool.query('SELECT id FROM users WHERE email = $1', [trimmedEmail])
        .then((result) => {
            if (result.rows.length > 0) {
                return res
                    .status(409)
                    .json({ error: 'An account with this email already exists' });
            }

            const salt = crypto.randomBytes(16).toString('hex');
            const hashedPassword = crypto.scryptSync(password, salt, 64).toString('hex');

            const user = {
                id: generateId(),
                name: name.trim(),
                email: trimmedEmail,
                password: `${salt}:${hashedPassword}`,
            };

            return pool
                .query(
                    'INSERT INTO users (id, name, email, password, created_at) VALUES ($1, $2, $3, $4, NOW())',
                    [user.id, user.name, user.email, user.password]
                )
                .then(() => {
                    const token = crypto.randomBytes(24).toString('hex');
                    tokens.set(token, user.id);

                    res.status(201).json({
                        token,
                        user: { id: user.id, name: user.name, email: user.email },
                    });
                });
        })
        .catch((err) => {
            console.error('Signup error:', err);
            res.status(500).json({ error: 'Failed to create account' });
        });
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (!pool) {
        // Fallback to in-memory store
        const user = store.findUserByEmail(trimmedEmail);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const [salt, key] = user.password.split(':');
        // Handle legacy plaintext passwords from tests gracefully
        if (!key) {
            if (user.password !== password) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
        } else {
            const hashedBuffer = crypto.scryptSync(password, salt, 64);
            const keyBuffer = Buffer.from(key, 'hex');
            if (!crypto.timingSafeEqual(hashedBuffer, keyBuffer)) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
        }
        
        const token = crypto.randomBytes(24).toString('hex');
        tokens.set(token, user.id);
        
        return res.status(200).json({
            token,
            user: { id: user.id, name: user.name, email: user.email },
        });
    }

    pool.query('SELECT id, name, email, password FROM users WHERE email = $1', [trimmedEmail])
        .then((result) => {
            if (result.rows.length === 0) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            const user = result.rows[0];

            const [salt, key] = user.password.split(':');
            if (!key) {
                // Handle plaintext legacy
                if (user.password !== password) {
                    return res.status(401).json({ error: 'Invalid email or password' });
                }
            } else {
                const hashedBuffer = crypto.scryptSync(password, salt, 64);
                const keyBuffer = Buffer.from(key, 'hex');
                if (!crypto.timingSafeEqual(hashedBuffer, keyBuffer)) {
                    return res.status(401).json({ error: 'Invalid email or password' });
                }
            }

            const token = crypto.randomBytes(24).toString('hex');
            tokens.set(token, user.id);

            res.status(200).json({
                token,
                user: { id: user.id, name: user.name, email: user.email },
            });
        })
        .catch((err) => {
            console.error('Login error:', err);
            res.status(500).json({ error: 'Failed to log in' });
        });
});

/**
 * GET /api/food/search?q=...
 * Search USDA FoodData Central.
 */
app.get('/api/food/search', async (req, res) => {
    const query = req.query.q;
    if (!query || query.trim().length === 0) {
        return res.json({ results: [] });
    }

    try {
        const results = await searchFood(query.trim());
        res.json({ results });
    } catch (err) {
        console.error('Search error:', err.message);
        res.status(500).json({ error: 'Search failed' });
    }
});

/**
 * POST /api/log
 * Add a food entry to the CSV.
 * Body: { name, calories, protein, carbs, fat }
 */
app.post('/api/log', (req, res) => {
    const { name, calories, protein, carbs, fat } = req.body;

    if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Food name is required' });
    }

    if (!pool) {
        return res
            .status(500)
            .json({ error: 'Database is not configured. Set DATABASE_URL on Vercel.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const entry = {
        id: generateId(),
        date: today,
        name: name.trim(),
        calories: Number(calories) || 0,
        protein: +(Number(protein) || 0).toFixed(1),
        carbs: +(Number(carbs) || 0).toFixed(1),
        fat: +(Number(fat) || 0).toFixed(1),
    };

    pool.query(
        `
        INSERT INTO food_entries (id, date, name, calories, protein, carbs, fat, logged_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id, date, name, calories, protein, carbs, fat, logged_at
    `,
        [
            entry.id,
            entry.date,
            entry.name,
            entry.calories,
            entry.protein,
            entry.carbs,
            entry.fat,
        ]
    )
        .then((result) => {
            res.status(201).json({ entry: result.rows[0] });
        })
        .catch((err) => {
            console.error('Log error:', err);
            res.status(500).json({ error: 'Failed to save entry' });
        });
});

/**
 * GET /api/log?date=YYYY-MM-DD
 * Get food entries and totals for a date.
 */
app.get('/api/log', (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    if (!pool) {
        return res
            .status(500)
            .json({ error: 'Database is not configured. Set DATABASE_URL on Vercel.' });
    }

    pool.query(
        `
        SELECT id, date, name, calories, protein, carbs, fat, logged_at
        FROM food_entries
        WHERE date = $1
        ORDER BY logged_at ASC
    `,
        [date]
    )
        .then((result) => {
            const entries = result.rows;
            const totals = entries.reduce(
                (t, e) => ({
                    calories: t.calories + e.calories,
                    protein: +(t.protein + Number(e.protein || 0)).toFixed(1),
                    carbs: +(t.carbs + Number(e.carbs || 0)).toFixed(1),
                    fat: +(t.fat + Number(e.fat || 0)).toFixed(1),
                }),
                { calories: 0, protein: 0, carbs: 0, fat: 0 }
            );

            res.json({ date, entries, totals });
        })
        .catch((err) => {
            console.error('Load error:', err);
            res.status(500).json({ error: 'Failed to load entries' });
        });
});

// Initialize database schema (no-op if DATABASE_URL is not set)
initSchema()
    .then(() => {
        // Start server
        if (require.main === module) {
            app.listen(PORT, () => {
                console.log(`CALTRC running at http://localhost:${PORT}`);
            });
        }
    })
    .catch((err) => {
        console.error('Failed to initialize database schema:', err);
        process.exit(1);
    });

module.exports = app;
