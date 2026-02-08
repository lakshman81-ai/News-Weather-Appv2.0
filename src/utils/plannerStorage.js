/**
 * Planner Storage — localStorage date-keyed CRUD.
 * Each day key (YYYY-MM-DD) stores an array of planner items.
 * Supports merge, dedup (by ID/title similarity), and auto-prune.
 */

const STORAGE_KEY = 'upAhead_planner';
const PRUNE_DAYS_PAST = 7;

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function save(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        // storage full — silent
    }
}

/** Remove entries older than PRUNE_DAYS_PAST */
function prune(data) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - PRUNE_DAYS_PAST);
    const cutoffKey = cutoff.toISOString().slice(0, 10);
    for (const key of Object.keys(data)) {
        if (key < cutoffKey) delete data[key];
    }
    return data;
}

/** Simple title similarity (Jaccard on word sets) */
function similarity(a, b) {
    const wa = new Set(a.toLowerCase().split(/\s+/));
    const wb = new Set(b.toLowerCase().split(/\s+/));
    let intersection = 0;
    for (const w of wa) if (wb.has(w)) intersection++;
    return intersection / (wa.size + wb.size - intersection);
}

/** Check if an item is a duplicate of any existing item on that day */
function isDuplicate(existing, newItem) {
    return existing.some(item =>
        item.id === newItem.id ||
        (item.title && newItem.title && similarity(item.title, newItem.title) > 0.7)
    );
}

const plannerStorage = {
    /** Get items for a specific date key (YYYY-MM-DD) */
    getDay(dateKey) {
        const data = load();
        return data[dateKey] || [];
    },

    /** Get all stored data (pruned) */
    getAll() {
        let data = load();
        data = prune(data);
        save(data);
        return data;
    },

    /**
     * Merge items into one or more date keys.
     * Deduplicates by ID and title similarity.
     * @param {string[]} dateKeys
     * @param {object[]} items - each must have { id, title, ... }
     */
    merge(dateKeys, items) {
        let data = load();
        data = prune(data);

        for (const key of dateKeys) {
            if (!data[key]) data[key] = [];
            for (const item of items) {
                if (!isDuplicate(data[key], item)) {
                    data[key].push({ ...item, addedAt: Date.now() });
                }
            }
        }
        save(data);
    },

    /** Add a single item to a date key */
    addItem(dateKey, item) {
        this.merge([dateKey], [item]);
    },

    /** Remove an item by ID from a date key */
    removeItem(dateKey, itemId) {
        const data = load();
        if (!data[dateKey]) return;
        data[dateKey] = data[dateKey].filter(i => i.id !== itemId);
        if (data[dateKey].length === 0) delete data[dateKey];
        save(data);
    },

    /** Clear all planner data */
    clear() {
        localStorage.removeItem(STORAGE_KEY);
    },

    /** Get upcoming N days (from today) that have items */
    getUpcomingDays(n = 14) {
        const data = this.getAll();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const result = [];

        for (let i = 0; i < n; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            const key = d.toISOString().slice(0, 10);
            if (data[key] && data[key].length > 0) {
                result.push({ date: key, items: data[key] });
            }
        }
        return result;
    }
};

export default plannerStorage;
