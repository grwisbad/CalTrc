/**
 * Goal Engine — CALTRC
 *
 * Computes daily calorie/macro targets from survey data and tracks progress.
 */

/**
 * Activity level multipliers for calorie calculation.
 */
const ACTIVITY_MULTIPLIERS = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9,
};

function isDbPool(store) {
    return Boolean(store && typeof store.query === 'function');
}

/**
 * Compute daily goals from survey responses.
 * Uses Mifflin-St Jeor equation (simplified).
 *
 * @param {Object} surveyResponse - { answers: [{ questionId, value }] }
 * @returns {Object} { calorieTarget, proteinTarget, carbTarget, fatTarget }
 */
function computeGoals(surveyResponse) {
    const answers = surveyResponse.answers || [];
    const get = (id) => {
        const a = answers.find((a) => a.questionId === id);
        return a ? a.value : null;
    };

    const age = Number(get('age')) || 25;
    const heightFeet = Number(get('heightFeet')) || 5;
    const heightInches = Number(get('heightInches')) || 7;
    const weightLbs = Number(get('weightLbs')) || 154; // pounds
    const activityLevel = get('activityLevel') || 'moderate';

    // Convert imperial survey inputs to metric for Mifflin-St Jeor.
    const heightCm = ((heightFeet * 12) + heightInches) * 2.54;
    const weightKg = weightLbs * 0.453592;

    // Simplified Mifflin-St Jeor (gender-neutral average)
    const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.55;
    const calorieTarget = Math.round(bmr * multiplier);

    // Macro split: 30% protein, 40% carbs, 30% fat
    const proteinTarget = Math.round((calorieTarget * 0.3) / 4); // 4 cal/g protein
    const carbTarget = Math.round((calorieTarget * 0.4) / 4);     // 4 cal/g carbs
    const fatTarget = Math.round((calorieTarget * 0.3) / 9);      // 9 cal/g fat

    return { calorieTarget, proteinTarget, carbTarget, fatTarget };
}

/**
 * Get progress for a user on a given date.
 * @param {string} userId
 * @param {import('./dataStore') | import('pg').Pool} store
 * @param {string} [date] - YYYY-MM-DD, defaults to today
 * @returns {{ goal: Object|null, consumed: Object } | Promise<{ goal: Object|null, consumed: Object }>}
 */
function getProgress(userId, store, date) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    if (isDbPool(store)) {
        return Promise.all([
            store.query(
                'SELECT target_calories as "calorieTarget", target_protein as "proteinTarget", target_carbs as "carbTarget", target_fat as "fatTarget" FROM goals WHERE user_id = $1 AND date = $2',
                [userId, targetDate]
            ),
            store.query(
                'SELECT calories, protein, carbs, fat FROM food_entries WHERE user_id = $1 AND date = $2',
                [userId, targetDate]
            ),
        ]).then(([goalRes, entriesRes]) => {
            const goal = goalRes.rows.length > 0 ? goalRes.rows[0] : null;
            const entries = entriesRes.rows;

            const consumed = entries.reduce(
                (totals, e) => ({
                    calories: totals.calories + (Number(e.calories) || 0),
                    protein: totals.protein + (Number(e.protein) || 0),
                    carbs: totals.carbs + (Number(e.carbs) || 0),
                    fat: totals.fat + (Number(e.fat) || 0),
                }),
                { calories: 0, protein: 0, carbs: 0, fat: 0 }
            );

            return { goal, consumed };
        });
    }

    const goal = store.getGoal(userId, targetDate);
    const entries = store.getFoodEntriesByUser(userId, targetDate);

    const consumed = entries.reduce(
        (totals, e) => ({
            calories: totals.calories + e.calories,
            protein: totals.protein + e.protein,
            carbs: totals.carbs + e.carbs,
            fat: totals.fat + e.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    return { goal, consumed };
}

module.exports = {
    computeGoals,
    getProgress,
    ACTIVITY_MULTIPLIERS,
};
