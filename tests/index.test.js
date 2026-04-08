/**
 * Integration Tests — CALTRC
 *
 * Tests end-to-end flows across modules.
 */

const DataStore = require('../src/dataStore');
const { submitSurvey } = require('../src/surveyModule');
const { logFood } = require('../src/foodLogger');
const { computeGoals, getProgress } = require('../src/goalEngine');

describe('Integration Tests', () => {
    let store;

    beforeEach(() => {
        store = new DataStore();
    });

    describe('Survey → Goal Creation Flow', () => {
        test('submitting a survey produces a valid daily goal', () => {
            // Step 1: Submit survey
            const surveyResult = submitSurvey('user-001', [
                { questionId: 'age', value: 25 },
                { questionId: 'heightFeet', value: 5 },
                { questionId: 'heightInches', value: 9 },
                { questionId: 'weightLbs', value: 170 },
                { questionId: 'activityLevel', value: 'moderate' },
            ], store);

            expect(surveyResult.success).toBe(true);

            // Step 2: Compute goals from survey
            const goals = computeGoals(surveyResult.data);
            expect(goals.calorieTarget).toBeGreaterThan(1000);
            expect(goals.proteinTarget).toBeGreaterThan(0);

            // Step 3: Save goals
            const today = new Date().toISOString().split('T')[0];
            store.saveGoal({
                userId: 'user-001',
                date: today,
                ...goals,
            });

            // Step 4: Verify goal is retrievable
            const savedGoal = store.getGoal('user-001', today);
            expect(savedGoal.calorieTarget).toBe(goals.calorieTarget);
        });
    });

    describe('Food Log → Daily Summary Flow', () => {
        test('logging food updates the daily progress totals', () => {
            // Set up a goal
            const today = new Date().toISOString().split('T')[0];
            store.saveGoal({
                userId: 'user-001',
                date: today,
                calorieTarget: 2000,
                proteinTarget: 150,
                carbTarget: 200,
                fatTarget: 67,
            });

            // Log some food
            logFood('user-001', { name: 'Oatmeal', calories: 300, protein: 10, carbs: 50, fat: 6 }, store);
            logFood('user-001', { name: 'Chicken', calories: 400, protein: 40, carbs: 0, fat: 10 }, store);

            // Check progress
            const progress = getProgress('user-001', store);
            expect(progress.goal.calorieTarget).toBe(2000);
            expect(progress.consumed.calories).toBe(700);
            expect(progress.consumed.protein).toBe(50);

            // Remaining = target - consumed
            const remaining = progress.goal.calorieTarget - progress.consumed.calories;
            expect(remaining).toBe(1300);
        });
    });
});
