/**
 * News Audit System
 * Comprehensive idle-time analysis of stories for consensus, relevance, and anomalies.
 */

const STORAGE_KEY_HISTORY = 'news_audit_history';

/**
 * @typedef {Object} ConsensusData
 * @property {number} count - Number of unique sources validating this story
 * @property {string[]} sources - List of unique sources
 * @property {'⚡'|'⚡⚡'|null} badge - Visual indicator
 */

/**
 * @typedef {Object} RelevanceData
 * @property {number} score - Relevance score
 * @property {string[]} matches - Keywords or criteria matched
 * @property {'🎯'|'📌'|null} badge - Visual indicator
 */

/**
 * @typedef {Object} AnomalyData
 * @property {'age'|'score_high'|'score_low'|'none'} type - Type of anomaly
 * @property {string|null} badge - Visual indicator (e.g., '🕰️', '📊')
 */

/**
 * @typedef {Object} StoryAudit
 * @property {ConsensusData} consensus
 * @property {RelevanceData} relevance
 * @property {AnomalyData} anomaly
 * @property {string|null} persistenceBadge - '🌩️' if persisted from previous fetch
 */

/**
 * @typedef {Object.<string, StoryAudit>} AuditResultMap
 * Map of article ID to its audit result.
 */

// --- Helpers ---

function getMedian(values) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function getMean(values) {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

function getStdDev(values, mean) {
    if (values.length === 0) return 0;
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = getMean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
}

// --- Audit Functions ---

/**
 * Clusters articles to find cross-source validation.
 * Relies on sourceCount populated by rssAggregator.
 * @param {Array<Object>} articles - List of articles in a section
 * @returns {Object.<string, ConsensusData>} Map of article ID to consensus data
 */
export function computeConsensus(articles) {
    const results = {};
    articles.forEach(article => {
        const count = article.sourceCount || 1;
        let badge = null;
        if (count >= 3) badge = '⚡⚡';
        else if (count >= 2) badge = '⚡';

        results[article.id] = {
            count,
            sources: article.allSources || [article.source],
            badge
        };
    });
    return results;
}

/**
 * Checks if articles match user preferences (keywords/sources).
 * @param {Array<Object>} articles - List of articles
 * @param {Object} settings - User settings (keywords, sources)
 * @returns {Object.<string, RelevanceData>} Map of article ID to relevance data
 */
export function computeRelevance(articles, settings) {
    const results = {};
    if (!settings) return results;

    // 1. Gather Keywords
    const keywords = new Set();
    // From Followed Topics
    if (settings.followedTopics) {
        settings.followedTopics.forEach(t => keywords.add(t.query.toLowerCase()));
    }
    // From Legacy Keywords (if any)
    // Add logic if needed, usually in `settings.filterKeywords`? Not in default schema.

    // From Up Ahead (for context)
    if (settings.upAhead && settings.upAhead.keywords) {
        Object.values(settings.upAhead.keywords).flat().forEach(k => {
             if (k) keywords.add(k.toLowerCase());
        });
    }

    // 2. Gather Preferred Sources
    const preferredSources = Object.entries(settings.newsSources || {})
        .filter(([_, enabled]) => enabled)
        .map(([key]) => key.toLowerCase());

    articles.forEach(article => {
        const titleLower = (article.title || '').toLowerCase();
        const sourceLower = (article.source || '').toLowerCase();

        let matches = [];
        let score = 0;

        // Check Keywords
        keywords.forEach(kw => {
            if (titleLower.includes(kw)) {
                matches.push(kw);
                score += 1;
            }
        });

        // Check Source
        // Map source key (e.g., 'bbc') to display name is hard here without map.
        // But we can check if any preferred key is part of the source string?
        // Actually, `settings.newsSources` keys are like 'bbc', 'ndtv'.
        // Article source is 'BBC News'.
        // Simple includes check:
        const isPreferred = preferredSources.some(pref => sourceLower.includes(pref) || pref.includes(sourceLower));

        let badge = null;
        if (matches.length > 0) {
            badge = isPreferred ? '🎯' : '📌';
        }

        results[article.id] = {
            score,
            matches,
            badge
        };
    });

    return results;
}

/**
 * Checks for freshness anomalies (e.g., significantly older than peers).
 * @param {Array<Object>} articles - List of articles
 * @returns {Object.<string, AnomalyData>} Map of article ID to anomaly data
 */
export function computeFreshness(articles) {
    const results = {};
    if (articles.length < 3) return results;

    const now = Date.now();
    // Calculate ages in hours
    const ages = articles.map(a => (now - new Date(a.publishedAt).getTime()) / (1000 * 60 * 60));
    const medianAge = getMedian(ages);

    articles.forEach((article, idx) => {
        const age = ages[idx];
        let type = 'none';
        let badge = null;

        // If age is > 2x median AND age is > 6 hours (to avoid flagging 5m vs 10m)
        if (age > 6 && age > (medianAge * 2)) {
            type = 'age';
            badge = '🕰️';
        }

        results[article.id] = { type, badge };
    });

    return results;
}

/**
 * Checks for scoring anomalies (e.g., high score outliers).
 * @param {Array<Object>} articles - List of articles
 * @returns {Object.<string, AnomalyData>} Map of article ID to anomaly data
 */
export function computeAnomalies(articles) {
    const results = {};
    if (articles.length < 5) return results;

    const scores = articles.map(a => a.impactScore || 0);
    const mean = getMean(scores);
    const stdDev = getStdDev(scores, mean);

    articles.forEach(article => {
        const score = article.impactScore || 0;
        let type = 'none';
        let badge = null;

        if (score > (mean + 2 * stdDev)) {
            type = 'score_high';
            badge = '📊↑';
        } else if (score < (mean - 1.5 * stdDev)) {
            type = 'score_low';
            badge = '📊↓';
        }

        results[article.id] = { type, badge };
    });

    return results;
}

/**
 * Orchestrates the full audit process for all sections.
 * @param {Object} newsData - The full news data object
 * @param {Object} settings - User settings
 * @returns {Promise<AuditResultMap>} Comprehensive audit results
 */
export async function runFullAudit(newsData, settings) {
    const combinedAudit = {};

    // 1. Load Persistence History
    let history = {};
    try {
        const stored = localStorage.getItem(STORAGE_KEY_HISTORY);
        history = stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.warn('Failed to load audit history', e);
    }

    const newHistory = {};

    // 2. Process Each Section
    Object.entries(newsData).forEach(([section, articles]) => {
        if (!Array.isArray(articles) || articles.length === 0) return;

        // Run Logic
        const consensus = computeConsensus(articles);
        const relevance = computeRelevance(articles, settings);
        const freshness = computeFreshness(articles);
        const anomalies = computeAnomalies(articles);

        // Check Persistence (Top 10)
        const top10Ids = articles.slice(0, 10).map(a => a.id);
        const previousTop10 = new Set(history[section] || []);

        newHistory[section] = top10Ids;

        articles.forEach(article => {
            const id = article.id;
            const persistenceBadge = (top10Ids.includes(id) && previousTop10.has(id)) ? '🌩️' : null;

            // Breaking Verification (Feature 4d)
            let breakingVerified = null;
            if (article.isBreaking && consensus[id]?.count > 1) {
                breakingVerified = '✅';
            } else if (article.isBreaking) {
                breakingVerified = '❓';
            }

            combinedAudit[id] = {
                consensus: consensus[id],
                relevance: relevance[id],
                anomaly: anomalies[id]?.badge ? anomalies[id] : (freshness[id]?.badge ? freshness[id] : { type: 'none', badge: null }),
                persistenceBadge,
                breakingVerified
            };
        });
    });

    // 3. Save New History
    try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(newHistory));
    } catch (e) {
        console.warn('Failed to save audit history', e);
    }

    return combinedAudit;
}
