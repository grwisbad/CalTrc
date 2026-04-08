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

/**
 * Submit a survey.
 * @param {string} userId
 * @param {Object[]} answers
 * @param {import('./dataStore')} dataStore
 * @returns {{ success: boolean, data?: Object, errors?: string[] }}
 */
function submitSurvey(userId, answers, dataStore) {
    const validation = validateSurvey(answers);
    if (!validation.valid) {
        return { success: false, errors: validation.errors };
    }

    const surveyResponse = {
        userId,
        answers,
        completedAt: new Date().toISOString(),
    };

    dataStore.saveSurvey(surveyResponse);
    return { success: true, data: surveyResponse };
}

/**
 * Get a user's survey.
 * @param {string} userId
 * @param {import('./dataStore')} dataStore
 * @returns {Object|null}
 */
function getSurvey(userId, dataStore) {
    return dataStore.getSurvey(userId);
}

module.exports = {
    validateSurvey,
    submitSurvey,
    getSurvey,
    REQUIRED_QUESTIONS,
};
