/**
 * Auth API Tests — CALTRC
 */

const http = require('http');
const app = require('../src/server');

let server;
let baseUrl;

beforeAll((done) => {
    server = http.createServer(app);
    server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        done();
    });
});

afterAll((done) => {
    server.close(done);
});

// Helper
async function post(path, body) {
    const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    return { status: res.status, data };
}

describe('POST /api/auth/signup', () => {
    test('creates account with valid data → 201 + token', async () => {
        const { status, data } = await post('/api/auth/signup', {
            name: 'Alice',
            email: 'alice@example.com',
            password: 'secret123',
        });

        expect(status).toBe(201);
        expect(data.token).toBeDefined();
        expect(data.user.name).toBe('Alice');
        expect(data.user.email).toBe('alice@example.com');
        expect(data.user.password).toBeUndefined(); // should not leak
    });

    test('rejects missing fields → 400', async () => {
        const { status, data } = await post('/api/auth/signup', {
            name: 'Bob',
        });
        expect(status).toBe(400);
        expect(data.error).toBeDefined();
    });

    test('rejects short password → 400', async () => {
        const { status } = await post('/api/auth/signup', {
            name: 'Carl',
            email: 'carl@example.com',
            password: '123',
        });
        expect(status).toBe(400);
    });

    test('rejects duplicate email → 409', async () => {
        const { status, data } = await post('/api/auth/signup', {
            name: 'Alice2',
            email: 'alice@example.com',
            password: 'another123',
        });
        expect(status).toBe(409);
        expect(data.error).toMatch(/already exists/i);
    });
});

describe('POST /api/auth/login', () => {
    test('login with correct credentials → 200 + token', async () => {
        const { status, data } = await post('/api/auth/login', {
            email: 'alice@example.com',
            password: 'secret123',
        });

        expect(status).toBe(200);
        expect(data.token).toBeDefined();
        expect(data.user.name).toBe('Alice');
    });

    test('rejects wrong password → 401', async () => {
        const { status, data } = await post('/api/auth/login', {
            email: 'alice@example.com',
            password: 'wrongpassword',
        });
        expect(status).toBe(401);
        expect(data.error).toMatch(/invalid/i);
    });

    test('rejects non-existent email → 401', async () => {
        const { status } = await post('/api/auth/login', {
            email: 'nobody@example.com',
            password: 'secret123',
        });
        expect(status).toBe(401);
    });

    test('rejects missing fields → 400', async () => {
        const { status } = await post('/api/auth/login', {});
        expect(status).toBe(400);
    });
});
