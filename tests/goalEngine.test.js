/**
 * Unit Tests — Goal Engine
 */

const DataStore = require('../src/dataStore');
const { computeGoals, getProgress } = require('../src/goalEngine');
const { logFood } = require('../src/foodLogger');
const sampleSurvey = require('./fixtures/sampleSurvey.json');

describe('Goal Engine', () => {
    let store;

    beforeEach(() => {
        store = new DataStore();
    });

    // --- computeGoals ---

    describe('computeGoals', () => {
        test('returns a valid calorie target from survey data', () => {
            const goals = computeGoals(sampleSurvey);
            expect(goals.calorieTarget).toBeGreaterThan(0);
            expect(goals.proteinTarget).toBeGreaterThan(0);
            expect(goals.carbTarget).toBeGreaterThan(0);
            expect(goals.fatTarget).toBeGreaterThan(0);
        });

        test('higher activity level produces higher calorie target', () => {
            const moderate = computeGoals({
                answers: [
                    { questionId: 'age', value: 25 },
                    { questionId: 'heightFeet', value: 5 },
                    { questionId: 'heightInches', value: 9 },
                    { questionId: 'weightLbs', value: 170 },
                    { questionId: 'activityLevel', value: 'moderate' },
                ],
            });

            const active = computeGoals({
                answers: [
                    { questionId: 'age', value: 25 },
                    { questionId: 'heightFeet', value: 5 },
                    { questionId: 'heightInches', value: 9 },
                    { questionId: 'weightLbs', value: 170 },
                    { questionId: 'activityLevel', value: 'active' },
                ],
            });

            expect(active.calorieTarget).toBeGreaterThan(moderate.calorieTarget);
        });

        test('heavier weight in pounds produces higher calorie target', () => {
            const light = computeGoals({
                answers: [
                    { questionId: 'age', value: 25 },
                    { questionId: 'heightFeet', value: 5 },
                    { questionId: 'heightInches', value: 9 },
                    { questionId: 'weightLbs', value: 130 },
                    { questionId: 'activityLevel', value: 'moderate' },
                ],
            });

            const heavy = computeGoals({
                answers: [
                    { questionId: 'age', value: 25 },
                    { questionId: 'heightFeet', value: 5 },
                    { questionId: 'heightInches', value: 9 },
                    { questionId: 'weightLbs', value: 220 },
                    { questionId: 'activityLevel', value: 'moderate' },
                ],
            });

            expect(heavy.calorieTarget).toBeGreaterThan(light.calorieTarget);
        });

        test('uses default values when answers are missing', () => {
            const goals = computeGoals({ answers: [] });
            expect(goals.calorieTarget).toBeGreaterThan(0);
        });
    });

    // --- getProgress ---

    describe('getProgress', () => {
        test('returns zero consumed when no food logged', () => {
            const progress = getProgress('user-001', store);
            expect(progress.consumed.calories).toBe(0);
            expect(progress.consumed.protein).toBe(0);
        });

        test('correctly sums consumed calories from logged entries', () => {
            logFood('user-001', { name: 'Apple', calories: 95, protein: 0.5, carbs: 25, fat: 0.3 }, store);
            logFood('user-001', { name: 'Banana', calories: 105, protein: 1.3, carbs: 27, fat: 0.4 }, store);

            const progress = getProgress('user-001', store);
            expect(progress.consumed.calories).toBe(200);
            expect(progress.consumed.protein).toBeCloseTo(1.8);
        });

        test('returns null goal if none has been set', () => {
            const progress = getProgress('user-001', store);
            expect(progress.goal).toBeNull();
        });
    });
});
