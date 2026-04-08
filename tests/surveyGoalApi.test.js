const http = require('http');

const dbState = {
    users: [],
    sessions: [],
    surveys: [],
    goals: [],
    foodEntries: [],
};

jest.mock('../src/db', () => ({
    pool: {
        query: jest.fn(async (text, params) => {
            if (text.includes('SELECT id FROM users')) {
                const user = dbState.users.find((u) => u.email === params[0]);
                return { rows: user ? [{ id: user.id }] : [] };
            }
            if (text.includes('INSERT INTO users')) {
                dbState.users.push({ id: params[0], name: params[1], email: params[2], password: params[3] });
                return { rows: [] };
            }
            if (text.includes('SELECT id, name, email, password FROM users')) {
                const user = dbState.users.find((u) => u.email === params[0]);
                return { rows: user ? [user] : [] };
            }
            if (text.includes('INSERT INTO sessions')) {
                dbState.sessions.push({ token: params[0], user_id: params[1] });
                return { rows: [] };
            }
            if (text.includes('SELECT user_id FROM sessions')) {
                const session = dbState.sessions.find((s) => s.token === params[0]);
                return { rows: session ? [{ user_id: session.user_id }] : [] };
            }
            if (text.includes('INSERT INTO surveys')) {
                const existing = dbState.surveys.find((s) => s.user_id === params[1]);
                if (existing) {
                    existing.answers = JSON.parse(params[2]);
                    existing.completed_at = params[3];
                } else {
                    dbState.surveys.push({ id: params[0], user_id: params[1], answers: JSON.parse(params[2]), completed_at: params[3] });
                }
                return { rows: [] };
            }
            if (text.includes('SELECT answers, completed_at FROM surveys')) {
                const survey = dbState.surveys.find((s) => s.user_id === params[0]);
                return { rows: survey ? [{ answers: survey.answers, completed_at: survey.completed_at }] : [] };
            }
            if (text.includes('INSERT INTO goals')) {
                const [id, userId, date, cals, protein, carbs, fat] = params;
                const existing = dbState.goals.find((g) => g.user_id === userId && g.date === date);
                const row = {
                    id,
                    user_id: userId,
                    date,
                    calorieTarget: cals,
                    proteinTarget: protein,
                    carbTarget: carbs,
                    fatTarget: fat,
                };
                if (existing) Object.assign(existing, row);
                else dbState.goals.push(row);
                return { rows: [] };
            }
            if (text.includes('SELECT target_calories as "calorieTarget"')) {
                const goal = dbState.goals.find((g) => g.user_id === params[0] && g.date === params[1]);
                return { rows: goal ? [goal] : [] };
            }
            if (text.includes('SELECT calories, protein, carbs, fat FROM food_entries')) {
                const rows = dbState.foodEntries.filter((e) => e.user_id === params[0] && e.date === params[1]);
                return { rows };
            }
            return { rows: [] };
        }),
    },
    initSchema: jest.fn().mockResolvedValue(),
}));

const app = require('../src/server');

let server;
let baseUrl;

beforeAll((done) => {
    server = http.createServer(app);
    server.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        done();
    });
});

afterAll((done) => {
    server.close(done);
});

async function post(path, body, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
    return { status: res.status, data: await res.json() };
}

async function get(path, token) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}${path}`, { headers });
    return { status: res.status, data: await res.json() };
}

describe('Survey and Goal API', () => {
    let token;

    beforeAll(async () => {
        const signup = await post('/api/auth/signup', {
            name: 'Dana',
            email: 'dana@example.com',
            password: 'secure123',
        });
        token = signup.data.token;
    });

    test('rejects survey submission without auth', async () => {
        const res = await post('/api/survey', { answers: [] });
        expect(res.status).toBe(401);
    });

    test('saves valid survey and returns goals', async () => {
        const res = await post('/api/survey', {
            answers: [
                { questionId: 'age', value: 30 },
                { questionId: 'heightFeet', value: 5 },
                { questionId: 'heightInches', value: 11 },
                { questionId: 'weightLbs', value: 176 },
                { questionId: 'activityLevel', value: 'moderate' },
            ],
        }, token);

        expect(res.status).toBe(201);
        expect(res.data.survey.userId).toBeDefined();
        expect(res.data.goals.calorieTarget).toBeGreaterThan(0);
    });

    test('returns 400 when required survey fields are missing', async () => {
        const res = await post('/api/survey', {
            answers: [{ questionId: 'age', value: 30 }],
        }, token);

        expect(res.status).toBe(400);
        expect(Array.isArray(res.data.errors)).toBe(true);
    });

    test('returns saved survey for user', async () => {
        const res = await get('/api/survey', token);
        expect(res.status).toBe(200);
        expect(res.data.survey.answers.length).toBe(5);
    });

    test('returns today goal + consumed progress', async () => {
        const res = await get('/api/goals/today', token);
        expect(res.status).toBe(200);
        expect(res.data.goal.calorieTarget).toBeGreaterThan(0);
        expect(res.data.consumed.calories).toBe(0);
    });
});
