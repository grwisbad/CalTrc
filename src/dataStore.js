4/**
 * Data Store — CALTRC
 *
 * In-memory store used by unit tests and local module flows.
 */
class DataStore {
    constructor() {
        this.users = new Map();
        this.surveys = new Map();
        this.foodEntries = [];
        this.goals = new Map();
    }

    saveUser(user) {
        this.users.set(user.id, user);
        return user;
    }

    getUser(userId) {
        return this.users.get(userId) || null;
    }

    saveSurvey(surveyResponse) {
        this.surveys.set(surveyResponse.userId, surveyResponse);
        return surveyResponse;
    }

    getSurvey(userId) {
        return this.surveys.get(userId) || null;
    }

    saveFoodEntry(entry) {
        this.foodEntries.push(entry);
        return entry;
    }

    getFoodEntriesByUser(userId, date = null) {
        return this.foodEntries.filter((e) => {
            const matchUser = e.userId === userId;
            if (!date) return matchUser;
            const entryDate = new Date(e.loggedAt).toISOString().split('T')[0];
            return matchUser && entryDate === date;
        });
    }

    saveGoal(goal) {
        const key = `${goal.userId}_${goal.date}`;
        this.goals.set(key, goal);
        return goal;
    }

    getGoal(userId, date) {
        const key = `${userId}_${date}`;
        return this.goals.get(key) || null;
    }

    findUserByEmail(email) {
        for (const user of this.users.values()) {
            if (user.email === email) return user;
        }
        return null;
    }

    clear() {
        this.users.clear();
        this.surveys.clear();
        this.foodEntries = [];
        this.goals.clear();
    }
}

module.exports = DataStore;
