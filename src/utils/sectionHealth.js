/**
 * Section Health Monitoring Utilities
 * Tracks fetch yields and flags degrading sections.
 */

const STORAGE_KEY = 'news_section_health';
const HISTORY_SIZE = 3;

/**
 * @typedef {Object} SectionHealthStatus
 * @property {'ok'|'warning'|'critical'} status - Health status based on yield ratio
 * @property {number} ratio - Current yield / Average yield (0.0 to 1.0+)
 * @property {number} avg - Average yield from history
 * @property {number[]} history - Last 3 fetch counts
 */

/**
 * Records the fetch count for a section and updates the history.
 * @param {string} section - The section identifier (e.g., 'world', 'india')
 * @param {number} count - Number of articles fetched
 * @returns {void}
 */
export function recordFetchCount(section, count) {
    if (!section) return;

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const data = stored ? JSON.parse(stored) : {};

        const history = data[section] || [];

        // Add new count to the beginning
        history.unshift(count);

        // Keep only last N items
        if (history.length > HISTORY_SIZE) {
            history.length = HISTORY_SIZE;
        }

        data[section] = history;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.warn('[SectionHealth] Failed to record fetch count:', error);
    }
}

/**
 * Computes the health status of a section based on the current count and history.
 * @param {string} section - The section identifier
 * @param {number} currentCount - The number of articles fetched in the current run
 * @returns {SectionHealthStatus} The computed health status
 */
export function getSectionHealth(section, currentCount) {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const data = stored ? JSON.parse(stored) : {};
        const history = data[section] || [];

        // If no history, we can't determine health (first run is always OK)
        if (history.length === 0) {
            return { status: 'ok', ratio: 1.0, avg: currentCount, history: [] };
        }

        const sum = history.reduce((a, b) => a + b, 0);
        const avg = sum / history.length;

        // Avoid division by zero
        if (avg === 0) {
            return { status: 'ok', ratio: 1.0, avg: 0, history };
        }

        const ratio = currentCount / avg;
        let status = 'ok';

        if (ratio < 0.10) {
            status = 'critical';
        } else if (ratio < 0.50) {
            status = 'warning';
        }

        return { status, ratio, avg, history };
    } catch (error) {
        console.warn('[SectionHealth] Failed to compute health:', error);
        return { status: 'ok', ratio: 1.0, avg: 0, history: [] };
    }
}

/**
 * Checks if all articles in a list come from a single source.
 * @param {Array<Object>} articles - List of news articles
 * @returns {boolean} True if >3 articles exist and all share the same source
 */
export function checkSingleSource(articles) {
    if (!articles || articles.length <= 3) return false;

    const firstSource = articles[0].source;
    return articles.every(article => article.source === firstSource);
}

/**
 * Get all section health data for debugging
 */
export function getAllSectionHealth() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (error) {
        return {};
    }
}
