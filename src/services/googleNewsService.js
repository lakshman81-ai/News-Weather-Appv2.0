/**
 * Google News Intelligence Service
 * Generates parametric RSS URLs for high-resolution news retrieval.
 * Based on technical report: leverages hl, gl, ceid, and topic hashes.
 */

// Google News RSS URLs
const BASE_URL = "https://news.google.com/rss";
const SEARCH_URL = "https://news.google.com/rss/search";

// Topic Hashes (Base64 encoded paths used by Google News)
const TOPICS = {
    WORLD: "CAAqJggKIiBDQkFTRWvfSkwyMHZNRGx1YlY4U0JXVnVMVlZUR2dKVlV5Z0FQAQ",
    BUSINESS: "CAAqJggKIiBDQkFTRWvfSkwyMHZNRGx6TVdZU0JXVnVMVlZUR2dKVlV5Z0FQAQ",
    TECHNOLOGY: "CAAqJggKIiBDQkFTRWvfSkwyMHZNRGRqTVhZU0JXVnVMVlZUR2dKVlV5Z0FQAQ",
    ENTERTAINMENT: "CAAqJggKIiBDQkFTRWvfSkwyMHZNREpxYW5RU0JXVnVMVlZUR2dKVlV5Z0FQAQ",
    SPORTS: "CAAqJggKIiBDQkFTRWvfSkwyMHZNRFp1ZEdvU0JXVnVMVlZUR2dKVlV5Z0FQAQ",
    SCIENCE: "CAAqJggKIiBDQkFTRWvfSkwyMHZNRFp0Y1RjU0JXVnVMVlZUR2dKVlV5Z0FQAQ",
    HEALTH: "CAAqJggKIiBDQkFTRWvfSkwyMHZNR3QwTlRFU0JXVnVMVlZUR2dKVlV5Z0FQAQ"
};

/**
 * Construct a localized Google News RSS URL
 * @param {Object} config
 * @param {string} config.category - 'world', 'business', 'technology', etc.
 * @param {string} config.query - Search query (overrides category if present)
 * @param {string} config.country - 'IN', 'US', 'GB' (gl parameter)
 * @param {string} config.lang - 'en', 'ta', 'hi' (language code)
 * @returns {string} The formatted RSS URL
 */
export function getGoogleNewsUrl({ category, query, country = 'IN', lang = 'en' }) {
    // Construct param strings
    const hl = `${lang}-${country}`; // Host Language (e.g., en-IN)
    const gl = country;              // Geolocation (e.g., IN)
    const ceid = `${country}:${lang}`; // Custom Edition ID (e.g., IN:en)

    const params = `hl=${hl}&gl=${gl}&ceid=${ceid}`;

    // 1. Search Query (Highest Priority)
    if (query) {
        return `${SEARCH_URL}?q=${encodeURIComponent(query)}&${params}`;
    }

    // 2. Topic/Category
    if (category) {
        const upCat = category.toUpperCase();
        if (TOPICS[upCat]) {
            return `${BASE_URL}/topics/${TOPICS[upCat]}?${params}`;
        }
        // Fallback for standard categories if hash not found (though hashes are preferred)
        // return `${BASE_URL}/headlines/section/topic/${upCat}?${params}`;
    }

    // 3. Default (Top Headlines for region)
    return `${BASE_URL}?${params}`;
}

/**
 * Pre-defined feeds for specific sections
 */
export const GOOGLE_FEEDS = {
    // Specialized high-res feeds
    WORLD_IN: getGoogleNewsUrl({ category: 'world', country: 'IN', lang: 'en' }),
    BUSINESS_IN: getGoogleNewsUrl({ category: 'business', country: 'IN', lang: 'en' }),
    BUSINESS_IN_SEARCH: getGoogleNewsUrl({ query: 'Business Economy India', country: 'IN', lang: 'en' }), // Fallback
    TECH_IN: getGoogleNewsUrl({ category: 'technology', country: 'IN', lang: 'en' }),
    TECH_IN_SEARCH: getGoogleNewsUrl({ query: 'Technology Startups India', country: 'IN', lang: 'en' }), // Fallback

    // Regional/Language Specific
    TAMIL_NADU: getGoogleNewsUrl({ query: 'Tamil Nadu', country: 'IN', lang: 'ta' }),
    CHENNAI: getGoogleNewsUrl({ query: 'Chennai', country: 'IN', lang: 'en' }),

    // Global Authority
    WORLD_US: getGoogleNewsUrl({ category: 'world', country: 'US', lang: 'en' })
};
