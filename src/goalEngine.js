/**
 * Goal Engine — CALTRC
 *
 * Computes daily calorie/macro targets from survey data and tracks progress.
 */

const ACTIVITY_MULTIPLIERS = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9,
};

const GOAL_ADJUSTMENT = {
    lose: -350,
    maintain: 0,
    gain: 250,
};

function computeGoals(surveyResponse) {
    const answers = surveyResponse.answers || [];
    const get = (id) => {
        const a = answers.find((ans) => ans.questionId === id);
        return a ? a.value : null;
    };

    const age = Number(get('age')) || 25;
    const weight = Number(get('weight')) || 70;
    const heightCm = Number(get('heightCm')) || 170;
    const biologicalSex = get('biologicalSex') || 'male';
    const activityLevel = get('activityLevel') || 'moderate';
    const goalPace = get('goalPace') || 'maintain';

    const sexOffset = biologicalSex === 'female' ? -161 : 5;
    const bmr = 10 * weight + 6.25 * heightCm - 5 * age + sexOffset;
    const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.55;
    const maintenanceCalories = bmr * multiplier;
    const calorieTarget = Math.max(1200, Math.round(maintenanceCalories + (GOAL_ADJUSTMENT[goalPace] || 0)));

    const proteinTarget = Math.round((calorieTarget * 0.3) / 4);
    const carbTarget = Math.round((calorieTarget * 0.4) / 4);
    const fatTarget = Math.round((calorieTarget * 0.3) / 9);

    return { calorieTarget, proteinTarget, carbTarget, fatTarget };
}

async function getProgress(userId, pool) {
    const today = new Date().toISOString().split('T')[0];

    const goalRes = await pool.query('SELECT target_calories as "calorieTarget", target_protein as "proteinTarget", target_carbs as "carbTarget", target_fat as "fatTarget" FROM goals WHERE user_id = $1 AND date = $2', [userId, today]);
    const goal = goalRes.rows.length > 0 ? goalRes.rows[0] : null;

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
