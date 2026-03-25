/**
 * Unit Tests — Survey Module
 */

const { validateSurvey } = require('../src/surveyModule');
const sampleSurvey = require('./fixtures/sampleSurvey.json');
const incompleteSurvey = require('./fixtures/incompleteSurvey.json');

describe('Survey Module', () => {
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
            expect(result.errors.some((e) => e.includes('weight'))).toBe(true);
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
                { questionId: 'weight', value: 70 },
                { questionId: 'activityLevel', value: 'moderate' },
            ];
            const result = validateSurvey(answers);
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.includes('empty value'))).toBe(true);
        });
    });
});
