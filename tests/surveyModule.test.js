/**
 * Unit Tests — Survey Module
 */

const DataStore = require('../src/dataStore');
const { validateSurvey, submitSurvey, getSurvey } = require('../src/surveyModule');
const sampleSurvey = require('./fixtures/sampleSurvey.json');
const incompleteSurvey = require('./fixtures/incompleteSurvey.json');

describe('Survey Module', () => {
    let store;

    beforeEach(() => {
        store = new DataStore();
    });

    // --- validateSurvey ---

    describe('validateSurvey', () => {
        test('accepts a complete survey with all required questions', () => {
            const result = validateSurvey(sampleSurvey.answers);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('rejects an incomplete survey missing required questions', () => {
            const result = validateSurvey(incompleteSurvey.answers);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors.some((e) => e.includes('weightLbs'))).toBe(true);
            expect(result.errors.some((e) => e.includes('activityLevel'))).toBe(true);
        });

        test('rejects an empty answers array', () => {
            const result = validateSurvey([]);
            expect(result.valid).toBe(false);
        });

        test('rejects null/undefined answers', () => {
            const result = validateSurvey(null);
            expect(result.valid).toBe(false);
        });

        test('rejects answers with empty values', () => {
            const answers = [
                { questionId: 'age', value: '' },
                { questionId: 'heightFeet', value: 5 },
                { questionId: 'heightInches', value: 9 },
                { questionId: 'weightLbs', value: 170 },
                { questionId: 'activityLevel', value: 'moderate' },
            ];
            const result = validateSurvey(answers);
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.includes('empty value'))).toBe(true);
        });
    });

    // --- submitSurvey ---

    describe('submitSurvey', () => {
        test('saves a valid survey and returns success', () => {
            const result = submitSurvey('user-001', sampleSurvey.answers, store);
            expect(result.success).toBe(true);
            expect(result.data.userId).toBe('user-001');
            expect(result.data.completedAt).toBeDefined();
        });

        test('rejects an invalid survey and returns errors', () => {
            const result = submitSurvey('user-001', incompleteSurvey.answers, store);
            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });

    // --- getSurvey ---

    describe('getSurvey', () => {
        test('returns null for a user with no survey', () => {
            const result = getSurvey('nonexistent', store);
            expect(result).toBeNull();
        });

        test('returns the saved survey for a user', () => {
            submitSurvey('user-001', sampleSurvey.answers, store);
            const result = getSurvey('user-001', store);
            expect(result).not.toBeNull();
            expect(result.userId).toBe('user-001');
        });
    });
});
