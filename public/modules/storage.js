const memoryStore = new Map();
const CACHE_KEY_PREFIX = 'attendance_calc_';

export const Storage = {
    save(userId, key, data) {
        memoryStore.set(`${CACHE_KEY_PREFIX}${userId}_${key}`, data);
    },

    get(userId, key) {
        return memoryStore.get(`${CACHE_KEY_PREFIX}${userId}_${key}`) ?? null;
    },

    clear(userId) {
        // Clear all keys for this user
        const prefix = `${CACHE_KEY_PREFIX}${userId}`;
        for (const key of memoryStore.keys()) {
            if (key.startsWith(prefix)) {
                memoryStore.delete(key);
            }
        }
    }
};
