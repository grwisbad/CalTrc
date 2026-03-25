/**
 * Unit Tests — Goal Engine
 */

const { computeGoals } = require('../src/goalEngine');
const sampleSurvey = require('./fixtures/sampleSurvey.json');

describe('Goal Engine', () => {
    describe('computeGoals', () => {
        test('computes targets based on survey responses', () => {
            const goals = computeGoals(sampleSurvey);
            expect(goals).toBeDefined();
            expect(goals.calorieTarget).toBeGreaterThan(1500);
            expect(goals.proteinTarget).toBeGreaterThan(0);
            expect(goals.carbTarget).toBeGreaterThan(0);
            expect(goals.fatTarget).toBeGreaterThan(0);
        });

        test('uses defaults if survey is missing fields', () => {
            const goals = computeGoals({});
            expect(goals.calorieTarget).toBeGreaterThan(0);
        });
    });
});
