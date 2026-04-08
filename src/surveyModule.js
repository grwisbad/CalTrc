/**
 * Survey Module — CALTRC
 *
 * Handles survey validation and persistence.
 */

const REQUIRED_QUESTIONS = [
    'age',
    'heightCm',
    'weight',
    'biologicalSex',
    'activityLevel',
    'goalPace',
];

const ALLOWED_VALUES = {
    biologicalSex: ['male', 'female'],
    activityLevel: ['sedentary', 'light', 'moderate', 'active', 'veryActive'],
    goalPace: ['lose', 'maintain', 'gain'],
};

function validateSurvey(answers) {
    const errors = [];

    if (!Array.isArray(answers) || answers.length === 0) {
        return { valid: false, errors: ['Survey answers are required.'] };
    }

    const byId = new Map(answers.map((a) => [a.questionId, a.value]));

    for (const q of REQUIRED_QUESTIONS) {
        if (!byId.has(q)) {
            errors.push(`Missing required question: ${q}`);
        }
    }

    for (const answer of answers) {
        if (answer.value === undefined || answer.value === null || answer.value === '') {
            errors.push(`Question "${answer.questionId}" has an empty value.`);
        }
    }

    const age = Number(byId.get('age'));
    if (isNaN(age) || age < 13 || age > 100) {
        errors.push('Age must be between 13 and 100.');
    }

    const heightCm = Number(byId.get('heightCm'));
    if (isNaN(heightCm) || heightCm < 120 || heightCm > 230) {
        errors.push('Height must be between 120 and 230 cm.');
    }

    const weight = Number(byId.get('weight'));
    if (isNaN(weight) || weight < 30 || weight > 350) {
        errors.push('Weight must be between 30 and 350 kg.');
    }

    for (const key of Object.keys(ALLOWED_VALUES)) {
        const value = byId.get(key);
        if (value !== undefined && value !== null && value !== '' && !ALLOWED_VALUES[key].includes(value)) {
            errors.push(`Invalid value for ${key}.`);
        }
    }

    return { valid: errors.length === 0, errors };
}

async function submitSurvey(userId, answers, pool) {
    const validation = validateSurvey(answers);
    if (!validation.valid) {
        return { success: false, errors: validation.errors };
    }

    const surveyResponse = {
        userId,
        answers,
        completedAt: new Date().toISOString(),
    };

    await pool.query(
        'INSERT INTO surveys (id, user_id, answers, completed_at) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO UPDATE SET answers = EXCLUDED.answers, completed_at = EXCLUDED.completed_at',
        [`survey_${userId}`, userId, JSON.stringify(answers), surveyResponse.completedAt]
    );

    return { success: true, data: surveyResponse };
}

async function getSurvey(userId, pool) {
    const result = await pool.query('SELECT answers, completed_at FROM surveys WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) return null;
    return {
        userId,
        answers: result.rows[0].answers,
        completedAt: result.rows[0].completed_at,
    };
}

module.exports = {
    validateSurvey,
    submitSurvey,
    getSurvey,
    REQUIRED_QUESTIONS,
};
