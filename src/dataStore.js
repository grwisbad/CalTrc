/**
 * Data Store — CALTRC
 *
 * Abstracts persistence for all entities.
 * MVP: in-memory storage. Replace with SQLite/Firebase later.
 */

class DataStore {
    constructor() {
        this.users = new Map();
        this.surveys = new Map();
        this.foodEntries = [];
        this.goals = new Map();
    }

    // --- Users ---
    saveUser(user) {
        this.users.set(user.id, user);
        return user;
    }

    getUser(userId) {
        return this.users.get(userId) || null;
    }

    // --- Surveys ---
    saveSurvey(surveyResponse) {
        this.surveys.set(surveyResponse.userId, surveyResponse);
        return surveyResponse;
    }

    getSurvey(userId) {
        return this.surveys.get(userId) || null;
    }

    // --- Food Entries ---
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

    // --- Goals ---
    saveGoal(goal) {
        const key = `${goal.userId}_${goal.date}`;
        this.goals.set(key, goal);
        return goal;
    }

    getGoal(userId, date) {
        const key = `${userId}_${date}`;
        return this.goals.get(key) || null;
    }

    // --- User lookup ---
    findUserByEmail(email) {
        for (const user of this.users.values()) {
            if (user.email === email) return user;
        }
        return null;
    }

    // --- Reset (for testing) ---
    clear() {
        this.users.clear();
        this.surveys.clear();
        this.foodEntries = [];
        this.goals.clear();
    }
}

module.exports = DataStore;
