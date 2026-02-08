/**
 * Centralized log store singleton.
 * Services call logStore.add() to record fetch results, errors, timings.
 * The Debug tab subscribes for live updates.
 */

const MAX_ENTRIES = 300;

const store = {
    entries: [],
    subscribers: new Set(),
    // Aggregate counters for the fetch summary dashboard
    stats: {
        totalFetches: 0,
        successes: 0,
        failures: 0,
        totalMs: 0,
        byService: {}
    }
};

function notify() {
    store.subscribers.forEach(fn => fn());
}

function initService(name) {
    if (!store.stats.byService[name]) {
        store.stats.byService[name] = { ok: 0, fail: 0, totalMs: 0, lastStatus: null, lastTime: null };
    }
}

const logStore = {
    /**
     * Add a log entry.
     * @param {'info'|'warn'|'error'|'success'} level
     * @param {string} service - e.g. 'rssAggregator', 'weatherService', 'upAhead', 'proxy'
     * @param {string} message
     * @param {object} [meta] - optional extra data { durationMs, url, status }
     */
    add(level, service, message, meta = {}) {
        const entry = {
            ts: Date.now(),
            level,
            service,
            message,
            ...meta
        };

        store.entries.push(entry);
        if (store.entries.length > MAX_ENTRIES) store.entries.shift();

        // Update stats
        store.stats.totalFetches++;
        initService(service);
        const svc = store.stats.byService[service];

        if (level === 'error') {
            store.stats.failures++;
            svc.fail++;
            svc.lastStatus = 'fail';
        } else {
            store.stats.successes++;
            svc.ok++;
            svc.lastStatus = 'ok';
        }

        if (meta.durationMs) {
            store.stats.totalMs += meta.durationMs;
            svc.totalMs += meta.durationMs;
        }
        svc.lastTime = Date.now();

        notify();
    },

    /** Convenience methods */
    info(service, msg, meta) { this.add('info', service, msg, meta); },
    warn(service, msg, meta) { this.add('warn', service, msg, meta); },
    error(service, msg, meta) { this.add('error', service, msg, meta); },
    success(service, msg, meta) { this.add('success', service, msg, meta); },

    /** Get all entries (read-only snapshot) */
    getEntries() { return store.entries; },

    /** Get fetch summary stats */
    getStats() { return store.stats; },

    /** Subscribe to changes; returns unsubscribe fn */
    subscribe(fn) {
        store.subscribers.add(fn);
        return () => store.subscribers.delete(fn);
    },

    /** Clear all logs */
    clear() {
        store.entries.length = 0;
        store.stats = {
            totalFetches: 0,
            successes: 0,
            failures: 0,
            totalMs: 0,
            byService: {}
        };
        notify();
    }
};

export default logStore;
