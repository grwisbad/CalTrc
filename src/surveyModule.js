/**
 * Survey Module — CALTRC
 *
 * Handles survey presentation, validation, and storage.
 */

const REQUIRED_QUESTIONS = ['age', 'heightFeet', 'heightInches', 'weightLbs', 'activityLevel'];

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

function isDbPool(store) {
    return Boolean(store && typeof store.query === 'function');
}

/**
 * Submit a survey.
 * Supports either an in-memory DataStore or a PostgreSQL pool.
 *
 * @param {string} userId
 * @param {Object[]} answers
 * @param {import('./dataStore') | import('pg').Pool} store
 * @returns {{ success: boolean, data?: Object, errors?: string[] } | Promise<{ success: boolean, data?: Object, errors?: string[] }>}
 */
function submitSurvey(userId, answers, store) {
    const validation = validateSurvey(answers);
    if (!validation.valid) {
        return { success: false, errors: validation.errors };
    }

    const surveyResponse = {
        userId,
        answers,
        completedAt: new Date().toISOString(),
    };

    if (isDbPool(store)) {
        return store
            .query(
                'INSERT INTO surveys (id, user_id, answers, completed_at) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO UPDATE SET answers = EXCLUDED.answers, completed_at = EXCLUDED.completed_at',
                [`survey_${userId}`, userId, JSON.stringify(answers), surveyResponse.completedAt]
            )
            .then(() => ({ success: true, data: surveyResponse }));
    }

    store.saveSurvey(surveyResponse);
    return { success: true, data: surveyResponse };
}

/**
 * Get a user's survey.
 * Supports either an in-memory DataStore or a PostgreSQL pool.
 *
 * @param {string} userId
 * @param {import('./dataStore') | import('pg').Pool} store
 * @returns {Object|null|Promise<Object|null>}
 */
function getSurvey(userId, store) {
    if (isDbPool(store)) {
        return store
            .query('SELECT answers, completed_at FROM surveys WHERE user_id = $1', [userId])
            .then((result) => {
                if (result.rows.length === 0) return null;
                return {
                    userId,
                    answers: result.rows[0].answers,
                    completedAt: result.rows[0].completed_at,
                };
            });
    }

    return store.getSurvey(userId);
}

module.exports = {
    validateSurvey,
    submitSurvey,
    getSurvey,
    REQUIRED_QUESTIONS,
};
