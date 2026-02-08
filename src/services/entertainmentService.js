/**
 * Entertainment News Service
 * Fetches entertainment news from regional sources
 * - Tamil/Kollywood
 * - Hindi/Bollywood
 * - Hollywood
 * - OTT/Streaming
 */

import { fetchAndParseFeed } from './rssAggregator';

// ============================================
// ENTERTAINMENT RSS FEEDS
// ============================================

const ENTERTAINMENT_FEEDS = {
    tamil: [
        'https://www.thenewsminute.com/tamil-nadu/entertainment/feed',
        'https://www.behindwoods.com/tamil-movies/rss-feeds/news.xml',
        'https://timesofindia.indiatimes.com/rssfeeds/1081479906.cms' // Tamil Cinema
    ],
    hindi: [
        'https://www.bollywoodhungama.com/rss/news.xml',
        'https://www.filmfare.com/feeds/bollywood.xml',
        'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms' // Bollywood
    ],
    hollywood: [
        'https://www.hollywoodreporter.com/feed/',
        'https://variety.com/feed/',
        'https://deadline.com/feed/'
    ],
    ott: [
        'https://www.whats-on-netflix.com/feed/',
        'https://www.cordcuttersnews.com/feed/',
        'https://www.streamingmedia.com/RSS/Articles.aspx'
    ]
};

// ============================================
// FETCH FUNCTIONS
// ============================================

/**
 * Fetch Tamil/Kollywood entertainment news
 */
export async function fetchTamilEntertainment() {
    console.log('[EntertainmentService] Fetching Tamil/Kollywood news...');

    const allArticles = [];

    for (const feedUrl of ENTERTAINMENT_FEEDS.tamil) {
        try {
            const articles = await fetchAndParseFeed(feedUrl, 'entertainment');
            allArticles.push(...articles.map(article => ({
                ...article,
                category: 'Tamil Cinema',
                region: 'tamil'
            })));
        } catch (error) {
            console.warn(`[EntertainmentService] Failed to fetch ${feedUrl}:`, error.message);
        }
    }

    // Sort by date and return top 20
    return allArticles
        .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
        .slice(0, 20);
}

/**
 * Fetch Hindi/Bollywood entertainment news
 */
export async function fetchHindiEntertainment() {
    console.log('[EntertainmentService] Fetching Hindi/Bollywood news...');

    const allArticles = [];

    for (const feedUrl of ENTERTAINMENT_FEEDS.hindi) {
        try {
            const articles = await fetchAndParseFeed(feedUrl, 'entertainment');
            allArticles.push(...articles.map(article => ({
                ...article,
                category: 'Hindi Cinema',
                region: 'hindi'
            })));
        } catch (error) {
            console.warn(`[EntertainmentService] Failed to fetch ${feedUrl}:`, error.message);
        }
    }

    return allArticles
        .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
        .slice(0, 20);
}

/**
 * Fetch Hollywood entertainment news
 */
export async function fetchHollywoodEntertainment() {
    console.log('[EntertainmentService] Fetching Hollywood news...');

    const allArticles = [];

    for (const feedUrl of ENTERTAINMENT_FEEDS.hollywood) {
        try {
            const articles = await fetchAndParseFeed(feedUrl, 'entertainment');
            allArticles.push(...articles.map(article => ({
                ...article,
                category: 'Hollywood',
                region: 'hollywood'
            })));
        } catch (error) {
            console.warn(`[EntertainmentService] Failed to fetch ${feedUrl}:`, error.message);
        }
    }

    return allArticles
        .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
        .slice(0, 20);
}

/**
 * Fetch OTT/Streaming entertainment news
 */
export async function fetchOTTEntertainment() {
    console.log('[EntertainmentService] Fetching OTT/Streaming news...');

    const allArticles = [];

    for (const feedUrl of ENTERTAINMENT_FEEDS.ott) {
        try {
            const articles = await fetchAndParseFeed(feedUrl, 'entertainment');
            allArticles.push(...articles.map(article => ({
                ...article,
                category: 'OTT & Streaming',
                region: 'ott'
            })));
        } catch (error) {
            console.warn(`[EntertainmentService] Failed to fetch ${feedUrl}:`, error.message);
        }
    }

    return allArticles
        .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
        .slice(0, 20);
}

// ============================================
// COMBINED ENTERTAINMENT FETCH
// ============================================

/**
 * Fetch all entertainment news with weighted distribution
 * @param {Object} settings - Entertainment settings with percentages
 * @returns {Array} Mixed entertainment articles based on distribution
 */
export async function fetchAllEntertainment(settings = {}) {
    console.log('[EntertainmentService] 🎬 Fetching all entertainment news...');

    const {
        tamilPercent = 40,
        hindiPercent = 35,
        hollywoodPercent = 15,
        ottPercent = 10
    } = settings;

    // Fetch all categories in parallel
    const [tamil, hindi, hollywood, ott] = await Promise.allSettled([
        fetchTamilEntertainment(),
        fetchHindiEntertainment(),
        fetchHollywoodEntertainment(),
        fetchOTTEntertainment()
    ]);

    // Extract successful results
    const tamilArticles = tamil.status === 'fulfilled' ? tamil.value : [];
    const hindiArticles = hindi.status === 'fulfilled' ? hindi.value : [];
    const hollywoodArticles = hollywood.status === 'fulfilled' ? hollywood.value : [];
    const ottArticles = ott.status === 'fulfilled' ? ott.value : [];

    // Calculate distribution (assume 40 total articles)
    const totalArticles = 40;
    const distribution = {
        tamil: Math.round(totalArticles * (tamilPercent / 100)),
        hindi: Math.round(totalArticles * (hindiPercent / 100)),
        hollywood: Math.round(totalArticles * (hollywoodPercent / 100)),
        ott: Math.round(totalArticles * (ottPercent / 100))
    };

    // Build mixed array based on distribution
    const mixedArticles = [
        ...tamilArticles.slice(0, distribution.tamil),
        ...hindiArticles.slice(0, distribution.hindi),
        ...hollywoodArticles.slice(0, distribution.hollywood),
        ...ottArticles.slice(0, distribution.ott)
    ];

    // Shuffle to mix regions
    const shuffled = mixedArticles.sort(() => Math.random() - 0.5);

    console.log('[EntertainmentService] ✅ Entertainment news fetched:', {
        tamil: distribution.tamil,
        hindi: distribution.hindi,
        hollywood: distribution.hollywood,
        ott: distribution.ott,
        total: shuffled.length
    });

    return shuffled;
}

// Export individual functions
export default {
    fetchTamilEntertainment,
    fetchHindiEntertainment,
    fetchHollywoodEntertainment,
    fetchOTTEntertainment,
    fetchAllEntertainment
};
