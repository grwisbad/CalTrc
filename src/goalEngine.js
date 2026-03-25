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
    const weight = Number(get('weight')) || 70; // kg
    const activityLevel = get('activityLevel') || 'moderate';

    // Simplified Mifflin-St Jeor (gender-neutral average)
    const bmr = 10 * weight + 6.25 * 170 - 5 * age + 5; // assume 170cm height
    const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.55;
    const calorieTarget = Math.round(bmr * multiplier);

    // Macro split: 30% protein, 40% carbs, 30% fat
    const proteinTarget = Math.round((calorieTarget * 0.3) / 4); // 4 cal/g protein
    const carbTarget = Math.round((calorieTarget * 0.4) / 4);     // 4 cal/g carbs
    const fatTarget = Math.round((calorieTarget * 0.3) / 9);      // 9 cal/g fat

    return { calorieTarget, proteinTarget, carbTarget, fatTarget };
}

/**
 * Get progress for a user today.
 * @param {string} userId
 * @param {import('pg').Pool} pool
 * @returns {Promise<{ goal: Object|null, consumed: Object }>}
 */
async function getProgress(userId, pool) {
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch Goal
    const goalRes = await pool.query('SELECT target_calories as "calorieTarget", target_protein as "proteinTarget", target_carbs as "carbTarget", target_fat as "fatTarget" FROM goals WHERE user_id = $1 AND date = $2', [userId, today]);
    const goal = goalRes.rows.length > 0 ? goalRes.rows[0] : null;
    
    // Fetch consumed entries
    const entriesRes = await pool.query('SELECT calories, protein, carbs, fat FROM food_entries WHERE user_id = $1 AND date = $2', [userId, today]);
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
}

module.exports = {
    computeGoals,
    getProgress,
    ACTIVITY_MULTIPLIERS,
};
