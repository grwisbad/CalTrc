/**
 * Unit Tests — Food Logger
 */

const { searchFood, generateId, NUTRIENT_IDS } = require('../src/foodLogger');

describe('Food Logger Module', () => {
    describe('generateId', () => {
        test('creates a unique string id', () => {
            const id1 = generateId();
            const id2 = generateId();
            expect(typeof id1).toBe('string');
            expect(id1).not.toBe(id2);
        });
    });

    describe('searchFood', () => {
        test('returns an empty array on network failure', async () => {
            const mockFetch = jest.fn().mockRejectedValue(new Error('Network Error'));
            const results = await searchFood('apple', mockFetch);
            expect(results).toEqual([]);
        });

        test('parses simplified food results correctly', async () => {
            // Mock a successful JSON response
            const mockFetch = jest.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    foods: [
                        {
                            fdcId: 12345,
                            description: 'Apple, raw',
                            brandOwner: 'Orchard Farms',
                            servingSize: 100,
                            servingSizeUnit: 'g',
                            foodNutrients: [
                                { nutrientId: NUTRIENT_IDS.ENERGY, value: 52 },
                                { nutrientId: NUTRIENT_IDS.PROTEIN, value: 0.3 },
                                { nutrientId: NUTRIENT_IDS.CARBS, value: 13.8 },
                                { nutrientId: NUTRIENT_IDS.FAT, value: 0.2 },
                            ],
                        },
                    ],
                }),
            });

            const results = await searchFood('apple', mockFetch);
            expect(results).toHaveLength(1);
            expect(results[0].fdcId).toBe(12345);
            expect(results[0].name).toBe('Apple, raw');
            expect(results[0].calories).toBe(52);
            expect(results[0].protein).toBe(0.3);
            expect(results[0].brand).toBe('Orchard Farms');
        });

        test('retries on failure and eventually succeeds', async () => {
            const mockFetch = jest.fn()
                .mockRejectedValueOnce(new Error('Transient Failure 1'))
                .mockRejectedValueOnce(new Error('Transient Failure 2'))
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ foods: [{ description: 'Succes' }] })
                });

            const results = await searchFood('test', mockFetch);
            expect(mockFetch).toHaveBeenCalledTimes(3);
            expect(results).toHaveLength(1);
            expect(results[0].name).toBe('Succes');
        });

        test('exhausts all retries and returns empty array', async () => {
            const mockFetch = jest.fn().mockRejectedValue(new Error('Permafail'));
            const results = await searchFood('test', mockFetch);
            expect(mockFetch).toHaveBeenCalledTimes(3);
            expect(results).toEqual([]);
        });
    });
});
