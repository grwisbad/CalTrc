/**
 * Survey Module — CALTRC
 *
 * Handles survey presentation, validation, and storage.
 */

const REQUIRED_QUESTIONS = ['age', 'weight', 'activityLevel'];

/**
 * Validate survey answers.
 * @param {Object[]} answers - Array of { questionId, value }
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateSurvey(answers) {
    const errors = [];

    if (!Array.isArray(answers) || answers.length === 0) {
        return { valid: false, errors: ['Survey answers are required.'] };
    }

    const answeredIds = answers.map((a) => a.questionId);

    for (const q of REQUIRED_QUESTIONS) {
        if (!answeredIds.includes(q)) {
            errors.push(`Missing required question: ${q}`);
        }
    }

    for (const answer of answers) {
        if (answer.value === undefined || answer.value === null || answer.value === '') {
            errors.push(`Question "${answer.questionId}" has an empty value.`);
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Submit a survey.
 * @param {string} userId
 * @param {Object[]} answers
 * @param {import('pg').Pool} pool
 * @returns {Promise<{ success: boolean, data?: Object, errors?: string[] }>}
 */
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

/**
 * Get a user's survey.
 * @param {string} userId
 * @param {import('pg').Pool} pool
 * @returns {Promise<Object|null>}
 */
async function getSurvey(userId, pool) {
    const result = await pool.query('SELECT answers, completed_at FROM surveys WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) return null;
    return {
        userId,
        answers: result.rows[0].answers,
        completedAt: result.rows[0].completed_at
    };
}

module.exports = {
    validateSurvey,
    submitSurvey,
    getSurvey,
    REQUIRED_QUESTIONS,
};
