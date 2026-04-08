/**
 * Food Logger — CALTRC
 *
 * Handles food entry creation, USDA FDC search, and daily log retrieval.
 */

const crypto = require('crypto');

/** Generate a unique ID. */
function generateId() {
    try {
        return crypto.randomUUID();
    } catch {
        return `entry_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }
}

/**
 * USDA FDC nutrient IDs.
 */
const NUTRIENT_IDS = {
    ENERGY: 1008,
    PROTEIN: 1003,
    CARBS: 1005,
    FAT: 1004,
};

/**
 * Search foods using USDA FoodData Central API.
 * @param {string} query - Search term
 * @param {Function} [fetchFn] - Injectable fetch function (for testing)
 * @param {string} [apiKey] - API key (defaults to DEMO_KEY)
 * @returns {Promise<Object[]>} Array of simplified food results
 */
async function searchFood(query, fetchFn = null, apiKey = 'DEMO_KEY') {
    const fetcher = fetchFn || globalThis.fetch;
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        attempt++;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

        try {
            const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(query)}&pageSize=8`;
            const res = await fetcher(url, { signal: controller.signal });
            
            if (!res.ok) {
                throw new Error(`USDA API error: ${res.status}`);
            }

            const data = await res.json();
            clearTimeout(timeoutId);

            if (!data.foods || !Array.isArray(data.foods)) return [];

            return data.foods.map((food) => {
                const getNutrient = (id) => {
                    const n = food.foodNutrients?.find((fn) => fn.nutrientId === id);
                    return n ? +(n.value || 0).toFixed(1) : 0;
                };

                return {
                    fdcId: food.fdcId,
                    name: food.description || 'Unknown',
                    brand: food.brandOwner || null,
                    calories: getNutrient(NUTRIENT_IDS.ENERGY),
                    protein: getNutrient(NUTRIENT_IDS.PROTEIN),
                    carbs: getNutrient(NUTRIENT_IDS.CARBS),
                    fat: getNutrient(NUTRIENT_IDS.FAT),
                    servingSize: food.servingSize || null,
                    servingUnit: food.servingSizeUnit || null,
                };
            });
        } catch (err) {
            clearTimeout(timeoutId);
            if (attempt === MAX_RETRIES) {
                return [];
            }
            // Wait 500ms before retrying
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    return [];
}

/**
 * Create and save a food entry.
 * @param {string} userId
 * @param {Object} foodData - { name, calories, protein, carbs, fat }
 * @param {import('./dataStore')} dataStore
 * @returns {Object} The saved food entry
 */
function logFood(userId, foodData, dataStore) {
    const entry = {
        id: generateId(),
        userId,
        barcode: foodData.barcode || null,
        name: foodData.name,
        calories: Number(foodData.calories) || 0,
        protein: Number(foodData.protein) || 0,
        carbs: Number(foodData.carbs) || 0,
        fat: Number(foodData.fat) || 0,
        loggedAt: new Date().toISOString(),
    };

    dataStore.saveFoodEntry(entry);
    return entry;
}

/**
 * Get today's food log for a user.
 * @param {string} userId
 * @param {import('./dataStore')} dataStore
 * @returns {Object[]} Array of food entries
 */
function getTodayLog(userId, dataStore) {
    const today = new Date().toISOString().split('T')[0];
    return dataStore.getFoodEntriesByUser(userId, today);
}

module.exports = {
    searchFood,
    logFood,
    getTodayLog,
    generateId,
    NUTRIENT_IDS,
};
