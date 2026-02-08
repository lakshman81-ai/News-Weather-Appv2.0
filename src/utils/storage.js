// Local Storage utility for settings persistence

const STORAGE_KEYS = {
    SETTINGS: 'dailyEventAI_settings',
    LAST_REFRESH: 'dailyEventAI_lastRefresh',
    CACHED_DATA: 'dailyEventAI_cachedData'
};

// Default settings - REDESIGNED SCHEMA
export const DEFAULT_SETTINGS = {
    // ========================================
    // INTERFACE
    // ========================================
    uiMode: 'timeline',  // 'timeline' | 'classic' | 'newspaper'
    theme: 'dark',       // 'dark' | 'light'
    fontSize: 26,        // Default base font size (User requested +6 from 20)

    // ========================================
    // DATA FRESHNESS & FILTERING
    // ========================================
    freshnessLimitHours: 36, // Deprecated? User asked for "Hide stories older than X hours" default 60.
    hideOlderThanHours: 60,  // New strict cutoff
    weatherFreshnessLimit: 4,
    strictFreshness: true,
    filteringMode: 'source', // 'source' | 'keyword'
    rankingMode: 'smart',    // 'smart' | 'legacy'

    // ========================================
    // RANKING WEIGHTS (CUSTOM RANKING SYSTEM)
    // ========================================
    rankingWeights: {
        // Temporal / Context
        temporal: {
            weekendBoost: 2.0,
            entertainmentBoost: 2.5
        },
        geo: {
            cityMatch: 1.5,
            maxScore: 5.0
        },

        // Impact Factors (Exposed for Custom Ranking)
        freshness: {
            decayHours: 26,     // Linear decay over X hours
            maxBoost: 3.0       // Maximum score for 0-minute old news
        },
        visual: {
            videoBoost: 1.3,    // Multiplier for video content
            imageBoost: 1.15    // Multiplier for standard images
        },
        sentiment: {
            positiveBoost: 0.5, // Additive score for positive sentiment
            negativeBoost: 0.3  // Additive score for negative sentiment
        },
        keyword: {
            matchBoost: 2.0     // Additive score for keyword match
        },
        source: {
            tier1Boost: 5.0,    // Multiplier/Base for high-tier sources
            tier2Boost: 3.0     // Multiplier/Base for mid-tier sources
        },

        // Audit Thresholds (System 3)
        audit: {
            consensusThreshold: 2,   // Min sources for Consensus (⚡)
            anomalySigma: 2.0        // StdDev multiplier for Anomaly (📊)
        }
    },

    // ========================================
    // WEATHER CONFIGURATION
    // ========================================
    weather: {
        models: {
            ecmwf: true,   // European Centre (most accurate)
            gfs: true,     // NOAA GFS (good precipitation)
            icon: true     // DWD ICON (excellent coverage)
        },
        cities: ['chennai', 'trichy', 'muscat'],
        showHumidity: true,
        showWind: false,
    },

    // ========================================
    // NEWS SECTIONS
    // ========================================
    sections: {
        world: { enabled: true, count: 5 },
        india: { enabled: true, count: 5 },
        chennai: { enabled: true, count: 5 },
        trichy: { enabled: true, count: 5 },
        local: { enabled: true, count: 5 },
        social: { enabled: true, count: 25 }, // User requested default 25
        entertainment: { enabled: true, count: 5 },
        business: { enabled: true, count: 5 },
        technology: { enabled: true, count: 5 }
    },

    // ========================================
    // NEWS SOURCES
    // ========================================
    newsSources: {
        bbc: true,
        reuters: true,
        ndtv: true,
        theHindu: true,
        toi: true,
        financialExpress: true,
        dtNext: true,
        omanObserver: true,
        moneyControl: true,
        variety: true,
        hollywoodReporter: true,
        bollywoodHungama: true,
        filmCompanion: true,
        indiaToday: true,
        timesOfOman: true
    },

    // ========================================
    // MARKET SETTINGS
    // ========================================
    market: {
        showIndices: true,
        showGainers: true,
        showLosers: true,
        showMutualFunds: true,
        showIPO: true,
        showSectorals: true,      // NEW - Phase 2
        showCommodities: true,    // NEW - Phase 2
        showCurrency: true,       // NEW - Phase 2
        showFIIDII: true,         // NEW - Phase 2
        cacheMinutes: 15,
    },

    // ========================================
    // ENTERTAINMENT DISTRIBUTION
    // ========================================
    entertainment: {
        tamilCount: 5,      // Tamil/Kollywood
        hindiCount: 5,      // Hindi/Bollywood
        hollywoodCount: 3,  // Hollywood
        ottCount: 2         // OTT/Streaming
    },

    // ========================================
    // SOCIAL TRENDS DISTRIBUTION
    // ========================================
    socialTrends: {
        worldCount: 8,
        indiaCount: 8,
        tamilnaduCount: 5,
        muscatCount: 4,
    },

    // ========================================
    // CUSTOM FEEDS
    // ========================================
    customFeeds: [],

    // ========================================
    // UP AHEAD SETTINGS (NEW)
    // ========================================
    upAhead: {
        categories: {
            movies: true,
            events: true, // Includes entertainment (theatre, arts)
            festivals: true,
            alerts: true,
            sports: true,
            shopping: true,      // NEW
            civic: true,         // NEW
            weather_alerts: true // NEW
        },
        locations: ["Chennai", "Muscat"],
        customLocation: "",
        keywords: {
            // User-added extras (built-in keywords are in upAheadService.js)
            movies: [],
            events: [],
            shopping: [],
            civic: [],
            weather_alerts: [],
            negative: []
        }
    },

    // ========================================
    // MANUAL OVERRIDES (Phase 2 & 8)
    // ========================================
    sectionOverrides: {
        // Map of articleID -> sectionName
        // e.g. "hash123": "chennai"
    },

    // ========================================
    // NEWSPAPER MODE SETTINGS (Phase 7)
    // ========================================
    newspaper: {
        enableImages: true,        // Fetch images from RSS enclosures
        headlinesCount: 3,         // Stories in headlines zone
        leadsCount: 6,             // Stories in section leads
        briefsCount: 12,           // Stories in briefs section
    },

    // ========================================
    // SCORING & PERSONALIZATION (NEW)
    // ========================================
    enableNewScoring: true,      // Master switch for new 9-factor scoring
    enableProximityScoring: false, // Boost local news (default OFF)

    // Diversity Settings (Phase 6)
    maxTopicPercent: 40,         // Max % of front page for one topic
    maxGeoPercent: 30,           // Max % of front page for one geography

    // Topic Following (NEW)
    // Stores objects: { id, name, query, icon, created, lastFetched, options }
    followedTopics: [],

    // Reading History for Suggestions
    readingHistory: [], // List of { title, id, timestamp }

    // Topic suggestions based on reading history
    topicSuggestions: {
        enabled: true,
        basedOnReadingHistory: true
    },

    // ========================================
    // ADVANCED / PERFORMANCE
    // ========================================
    enableCache: true,         // NEW - Phase 6: Enable memory cache for faster loads
    crawlerMode: 'auto',
    debugLogs: false,
};

/**
 * Get settings from localStorage
 * @returns {Object} Settings object
 */
export function getSettings() {
    // Determine dynamic default font size based on device
    // Desktop (>= 1024px): 18px (26 - 8)
    // Mobile: 26px (Unchanged)
    let defaultFontSize = DEFAULT_SETTINGS.fontSize;
    if (typeof window !== 'undefined') {
        defaultFontSize = window.innerWidth >= 1024 ? 18 : 26;
    }

    const dynamicDefaults = {
        ...DEFAULT_SETTINGS,
        fontSize: defaultFontSize
    };

    try {
        const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Merge with defaults to ensure all keys exist
            return deepMerge(dynamicDefaults, parsed);
        }
    } catch (error) {
        void error;
        console.error('Error reading settings:', error);
    }
    return { ...dynamicDefaults };
}

/**
 * Save settings to localStorage
 * @param {Object} settings - Settings object to save
 */
export function saveSettings(settings) {
    try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
        return true;
    } catch (error) {
        void error;
        console.error('Error saving settings:', error);
        return false;
    }
}

/**
 * Update specific setting
 * @param {string} path - Dot-notation path to setting (e.g., 'sections.world.count')
 * @param {any} value - Value to set
 */
export function updateSetting(path, value) {
    const settings = getSettings();
    const keys = path.split('.');
    let obj = settings;

    for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
    }

    obj[keys[keys.length - 1]] = value;
    return saveSettings(settings);
}

/**
 * Reset settings to defaults
 */
export function resetSettings() {
    return saveSettings(DEFAULT_SETTINGS);
}

/**
 * Get last refresh timestamp for a section
 * @param {string} section - Section name
 * @returns {Date|null} Last refresh date or null
 */
export function getLastRefresh(section) {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.LAST_REFRESH);
        if (stored) {
            const timestamps = JSON.parse(stored);
            if (timestamps[section]) {
                return new Date(timestamps[section]);
            }
        }
    } catch (error) {
        void error;
        console.error('Error reading last refresh:', error);
    }
    return null;
}

/**
 * Set last refresh timestamp for a section
 * @param {string} section - Section name
 */
export function setLastRefresh(section) {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.LAST_REFRESH);
        const timestamps = stored ? JSON.parse(stored) : {};
        timestamps[section] = new Date().toISOString();
        localStorage.setItem(STORAGE_KEYS.LAST_REFRESH, JSON.stringify(timestamps));
    } catch (error) {
        void error;
        console.error('Error setting last refresh:', error);
    }
}

/**
 * Get time since last refresh as human-readable string
 * @param {string} section - Section name (optional, for specific section)
 * @returns {string} Human-readable time string
 */
export function getTimeSinceRefresh(section = null) {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.LAST_REFRESH);
        if (!stored) return 'Never';

        const timestamps = JSON.parse(stored);
        let lastTime = null;

        if (section && timestamps[section]) {
            lastTime = new Date(timestamps[section]);
        } else {
            // Get most recent refresh across all sections
            const times = Object.values(timestamps).map(t => new Date(t).getTime());
            if (times.length > 0) {
                lastTime = new Date(Math.max(...times));
            }
        }

        if (!lastTime) return 'Never';

        const now = new Date();
        const diffMs = now - lastTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return lastTime.toLocaleDateString();
    } catch (error) {
        void error;
        return 'Unknown';
    }
}

/**
 * Cache data for a section
 * @param {string} section - Section name
 * @param {any} data - Data to cache
 */
export function cacheData(section, data) {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.CACHED_DATA);
        const cache = stored ? JSON.parse(stored) : {};
        cache[section] = {
            data,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEYS.CACHED_DATA, JSON.stringify(cache));
    } catch (error) {
        void error;
        console.error('Error caching data:', error);
    }
}

/**
 * Get cached data for a section
 * @param {string} section - Section name
 * @param {number} maxAgeMs - Maximum age in milliseconds (default: 30 minutes)
 * @returns {any|null} Cached data or null if expired/missing
 */
export function getCachedData(section, maxAgeMs = 30 * 60 * 1000) {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.CACHED_DATA);
        if (!stored) return null;

        const cache = JSON.parse(stored);
        if (!cache[section]) return null;

        const age = new Date() - new Date(cache[section].timestamp);
        if (age > maxAgeMs) return null;

        return cache[section].data;
    } catch (error) {
        void error;
        console.error('Error reading cache:', error);
        return null;
    }
}

/**
 * Clear all cached data
 */
export function clearCache() {
    try {
        localStorage.removeItem(STORAGE_KEYS.CACHED_DATA);
        localStorage.removeItem(STORAGE_KEYS.LAST_REFRESH);
    } catch (error) {
        void error;
        console.error('Error clearing cache:', error);
    }
}

/**
 * Deep merge two objects
 */
function deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
        const val = source[key];
        // Skip null/undefined from stored settings — keep the default
        if (val === null || val === undefined) continue;

        if (typeof val === 'object' && !Array.isArray(val)) {
            result[key] = deepMerge(target[key] || {}, val);
        } else {
            result[key] = val;
        }
    }

    return result;
}

// ========================================
// TOPIC FOLLOWING HELPERS
// ========================================

export function addFollowedTopic(topic) {
    const settings = getSettings();
    settings.followedTopics = settings.followedTopics || [];
    settings.followedTopics.push({
        ...topic,
        id: `topic_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        created: new Date().toISOString(),
        lastFetched: null
    });
    saveSettings(settings);
}

export function removeFollowedTopic(topicId) {
    const settings = getSettings();
    settings.followedTopics = settings.followedTopics.filter(t => t.id !== topicId);
    saveSettings(settings);
}

export function updateTopicLastFetched(topicId) {
    const settings = getSettings();
    const topic = settings.followedTopics.find(t => t.id === topicId);
    if (topic) {
        topic.lastFetched = new Date().toISOString();
        saveSettings(settings);
    }
}

// ========================================
// READING HISTORY & SUGGESTIONS
// ========================================

export function addReadArticle(article) {
    if (!article || !article.title) return;

    const settings = getSettings();
    const history = settings.readingHistory || [];

    // Avoid duplicates
    if (history.some(h => h.id === article.id)) return;

    // Add new entry
    history.unshift({
        id: article.id,
        title: article.title,
        description: article.description || '',
        timestamp: Date.now()
    });

    // Limit history size (e.g., 50 items)
    if (history.length > 50) {
        history.length = 50;
    }

    settings.readingHistory = history;
    saveSettings(settings);
}

/**
 * Basic keyword extraction for topic suggestions
 */
export function getSuggestedTopics() {
    const settings = getSettings();
    const history = settings.readingHistory || [];

    if (history.length === 0) return [];

    const text = history.map(h => `${h.title} ${h.description}`).join(' ').toLowerCase();

    // Simple stopwords removal
    const stopWords = ['the', 'and', 'in', 'of', 'to', 'a', 'is', 'for', 'on', 'with', 'at', 'from', 'by', 'an', 'be', 'as', 'it', 'has', 'that', 'are', 'was', 'will', 'says', 'said', 'after', 'over', 'new', 'more', 'about', 'can', 'top', 'best', 'india', 'news', 'update', 'latest', 'today', 'live'];

    const words = text.match(/\b[a-z]{4,}\b/g) || [];
    const counts = {};

    words.forEach(w => {
        if (!stopWords.includes(w)) {
            counts[w] = (counts[w] || 0) + 1;
        }
    });

    // Sort by frequency
    const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word, count]) => ({
            word: word.charAt(0).toUpperCase() + word.slice(1),
            count
        }));

    return sorted;
}
