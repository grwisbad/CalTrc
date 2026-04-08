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
const { submitSurvey, getSurvey } = require('./surveyModule');
const { computeGoals, getProgress } = require('./goalEngine');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

async function upsertGoalForToday(userId, goals) {
    const today = getTodayDate();
    await pool.query(
        `
        INSERT INTO goals (id, user_id, date, target_calories, target_protein, target_carbs, target_fat, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (user_id, date)
        DO UPDATE SET
            target_calories = EXCLUDED.target_calories,
            target_protein = EXCLUDED.target_protein,
            target_carbs = EXCLUDED.target_carbs,
            target_fat = EXCLUDED.target_fat
    `,
        [
            `goal_${userId}_${today}`,
            userId,
            today,
            goals.calorieTarget,
            goals.proteinTarget,
            goals.carbTarget,
            goals.fatTarget,
        ]
    );
}

// --- Auth Middleware ---
async function requireAuth(req, res, next) {
    if (!pool) return res.status(500).json({ error: 'Database unconfigured' });
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.split(' ')[1];
    try {
        const result = await pool.query('SELECT user_id FROM sessions WHERE token = $1', [token]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        req.user = { id: result.rows[0].user_id };
        next();
    } catch (err) {
        console.error('Auth error:', err);
        res.status(500).json({ error: 'Authentication failed' });
    }
}

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
        return res.status(500).json({ error: 'Database is not configured. Set DATABASE_URL on Vercel.' });
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
                    return pool.query('INSERT INTO sessions (token, user_id) VALUES ($1, $2)', [token, user.id])
                        .then(() => {
                            res.status(201).json({
                                token,
                                user: { id: user.id, name: user.name, email: user.email },
                            });
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
        return res.status(500).json({ error: 'Database is not configured. Set DATABASE_URL on Vercel.' });
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
            return pool.query('INSERT INTO sessions (token, user_id) VALUES ($1, $2)', [token, user.id])
                .then(() => {
                    res.status(200).json({
                        token,
                        user: { id: user.id, name: user.name, email: user.email },
                    });
                });
        })
        .catch((err) => {
            console.error('Login error:', err);
            res.status(500).json({ error: 'Failed to log in' });
        });
});

/**
 * POST /api/survey
 * Body: { answers: [{ questionId, value }] }
 */
app.post('/api/survey', requireAuth, async (req, res) => {
    if (!pool) {
        return res.status(500).json({ error: 'Database is not configured. Set DATABASE_URL on Vercel.' });
    }

    const { answers } = req.body;

    try {
        const surveyResult = await submitSurvey(req.user.id, answers, pool);
        if (!surveyResult.success) {
            return res.status(400).json({ errors: surveyResult.errors });
        }

        const goals = computeGoals(surveyResult.data);
        await upsertGoalForToday(req.user.id, goals);

        res.status(201).json({
            survey: surveyResult.data,
            goals,
        });
    } catch (err) {
        console.error('Survey save error:', err);
        res.status(500).json({ error: 'Failed to save survey' });
    }
});

/**
 * GET /api/survey
 * Returns the authenticated user's survey if it exists.
 */
app.get('/api/survey', requireAuth, async (req, res) => {
    if (!pool) {
        return res.status(500).json({ error: 'Database is not configured. Set DATABASE_URL on Vercel.' });
    }

    try {
        const survey = await getSurvey(req.user.id, pool);
        if (!survey) {
            return res.status(404).json({ error: 'Survey not found' });
        }
        res.json({ survey });
    } catch (err) {
        console.error('Survey load error:', err);
        res.status(500).json({ error: 'Failed to load survey' });
    }
});

/**
 * GET /api/goals/today
 * Returns today's target goals and consumed totals.
 */
app.get('/api/goals/today', requireAuth, async (req, res) => {
    if (!pool) {
        return res.status(500).json({ error: 'Database is not configured. Set DATABASE_URL on Vercel.' });
    }

    try {
        const survey = await getSurvey(req.user.id, pool);
        if (!survey) {
            return res.status(404).json({ error: 'Survey required before goals are available' });
        }

        const computed = computeGoals(survey);
        await upsertGoalForToday(req.user.id, computed);
        const progress = await getProgress(req.user.id, pool);

        res.json(progress);
    } catch (err) {
        console.error('Goal load error:', err);
        res.status(500).json({ error: 'Failed to load goals' });
    }
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
app.post('/api/log', requireAuth, (req, res) => {
    const { name, calories, protein, carbs, fat } = req.body;

    if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Food name is required' });
    }

    const today = getTodayDate();
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
        INSERT INTO food_entries (id, user_id, date, name, calories, protein, carbs, fat, logged_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING id, date, name, calories, protein, carbs, fat, logged_at
    `,
        [
            entry.id,
            req.user.id,
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
app.get('/api/log', requireAuth, (req, res) => {
    const date = req.query.date || getTodayDate();

    pool.query(
        `
        SELECT id, date, name, calories, protein, carbs, fat, logged_at
        FROM food_entries
        WHERE date = $1 AND user_id = $2
        ORDER BY logged_at ASC
    `,
        [date, req.user.id]
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
