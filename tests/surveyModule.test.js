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
            expect(result.errors.some((e) => e.includes('heightCm'))).toBe(true);
            expect(result.errors.some((e) => e.includes('biologicalSex'))).toBe(true);
            expect(result.errors.some((e) => e.includes('activityLevel'))).toBe(true);
            expect(result.errors.some((e) => e.includes('goalPace'))).toBe(true);
        });

        test('rejects out-of-range values', () => {
            const result = validateSurvey([
                { questionId: 'age', value: 8 },
                { questionId: 'heightCm', value: 250 },
                { questionId: 'weight', value: 10 },
                { questionId: 'biologicalSex', value: 'robot' },
                { questionId: 'activityLevel', value: 'ultra' },
                { questionId: 'goalPace', value: 'teleport' },
            ]);
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.includes('Age must be'))).toBe(true);
            expect(result.errors.some((e) => e.includes('Height must be'))).toBe(true);
            expect(result.errors.some((e) => e.includes('Weight must be'))).toBe(true);
        });

        test('rejects non-numeric values for numeric fields', () => {
            const result = validateSurvey([
                { questionId: 'age', value: 'not-a-number' },
                { questionId: 'heightCm', value: 170 },
                { questionId: 'weight', value: 70 },
                { questionId: 'biologicalSex', value: 'male' },
                { questionId: 'activityLevel', value: 'moderate' },
                { questionId: 'goalPace', value: 'maintain' },
            ]);
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.includes('Age must be'))).toBe(true);
        });

        test('rejects empty or whitespace values', () => {
            const result = validateSurvey([
                { questionId: 'age', value: 25 },
                { questionId: 'heightCm', value: '' },
                { questionId: 'weight', value: ' ' },
                { questionId: 'biologicalSex', value: 'male' },
                { questionId: 'activityLevel', value: 'moderate' },
                { questionId: 'goalPace', value: 'maintain' },
            ]);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        test('handles null or missing answers array gracefully', () => {
            expect(validateSurvey(null).valid).toBe(false);
            expect(validateSurvey([]).valid).toBe(false);
        });
    });
});
