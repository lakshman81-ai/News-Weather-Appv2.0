/**
 * Centralized RSS aggregation & ranking service.
 * Designed for section-wise fetching and high-impact news extraction.
 */

import { GOOGLE_FEEDS } from './googleNewsService';
import { getSettings } from '../utils/storage';
import { fetchAllEntertainment } from './entertainmentService';
import { analyzeArticleSentiment } from '../utils/sentimentAnalyzer';
import { deduplicateAndCluster } from '../utils/similarity';
import { breakingDetector } from '../utils/breakingNewsDetector';
import { calculateSourceScore, getSourceWeightForCategory, SOURCE_METRICS } from '../data/sourceMetrics';
import { calculateImpactScore } from '../utils/impactScorer.js';
import { calculateProximityScore } from '../utils/proximityScorer.js';
import { calculateNoveltyScore } from '../utils/noveltyScorer.js';
import { calculateCurrencyScore } from '../utils/currencyScorer.js';
import { calculateHumanInterestScore } from '../utils/humanInterestScorer.js';
import { calculateVisualScore } from '../utils/visualScorer.js';
import { classifySection } from '../utils/sectionClassifier.js';
import { proxyManager } from './proxyManager.js';
import logStore from '../utils/logStore.js';
import { getSectionHealth, recordFetchCount, checkSingleSource } from '../utils/sectionHealth.js';

/**
 * @typedef {Object} NewsItem
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} link
 * @property {string} source
 * @property {number} publishedAt
 * @property {string} section
 * @property {number} impactScore
 * @property {string} time - Formatted time string
 */

const SECTION_FEEDS = {
    world: [
        GOOGLE_FEEDS.WORLD_IN, // Google News (IN Edition)
        "https://feeds.bbci.co.uk/news/world/rss.xml",
        "https://www.aljazeera.com/xml/rss/all.xml",
        GOOGLE_FEEDS.WORLD_US // Google News (US Edition for backup/variety)
    ],
    india: [
        GOOGLE_FEEDS.TAMIL_NADU, // Special Tamil focus via Google
        "https://feeds.feedburner.com/ndtvnews-top-stories",
        "https://www.thehindu.com/news/national/feeder/default.rss",
        "https://timesofindia.indiatimes.com/rssfeedstopstories.cms"
    ],
    chennai: [
        GOOGLE_FEEDS.CHENNAI,
        "https://www.thehindu.com/news/cities/chennai/feeder/default.rss"
    ],
    trichy: [
        "https://www.thehindu.com/news/cities/Tiruchirapalli/feeder/default.rss"
    ],
    local: [
        "https://news.google.com/rss/search?q=Muscat+Oman&hl=en-OM&gl=OM&ceid=OM:en",
        "https://www.muscatdaily.com/feed" // Backup (often > 48h old)
    ],
    business: [
        // "https://news.google.com/rss/search?q=Business+Economy+India&hl=en-IN&gl=IN&ceid=IN:en", // Working Replacement
        GOOGLE_FEEDS.BUSINESS_IN_SEARCH, // Switched to search-based
        "https://economictimes.indiatimes.com/rssfeedstopstories.cms",
        "https://www.moneycontrol.com/rss/business.xml",
        "https://www.livemint.com/rss/money",
        "https://feeds.bbci.co.uk/news/business/rss.xml", // Keeps BBC as global backup
        "https://www.cnbc.com/id/10001147/device/rss/rss.html"
    ],
    technology: [
        // "https://news.google.com/rss/search?q=Technology+Startups+India&hl=en-IN&gl=IN&ceid=IN:en", // Working Replacement
        GOOGLE_FEEDS.TECH_IN_SEARCH, // Switched to search-based
        "https://gadgets360.com/rss/news",
        "https://techcrunch.com/feed/",
        "https://www.theverge.com/rss/index.xml"
    ],
    sports: [
        "https://www.espn.com/espn/rss/news"
    ],
    entertainment: [
        "https://www.bollywoodhungama.com/rss/news.xml",
        "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml"
    ],
    social: [
        "https://www.theverge.com/rss/index.xml" // Proxy for trends
    ]
};

const SETTINGS_MAPPING = {
    bbc: "BBC",
    ndtv: "NDTV",
    theHindu: "The Hindu",
    toi: "Times of India",
    financialExpress: "Financial Express",
    dtNext: "DT Next",
    omanObserver: "Oman Observer",
    moneyControl: "Moneycontrol",
    indiaToday: "India Today",
    variety: "Variety",
    hollywoodReporter: "Hollywood Reporter",
    bollywoodHungama: "Bollywood Hungama",
    alJazeera: "Al Jazeera"
};

const KEYWORDS = [
    "breaking",
    "election",
    "war",
    "crisis",
    "ai",
    "market",
    "inflation",
    "conflict",
    "gold",
    "storm",
    "rain"
];

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const memoryCache = new Map();

/* ---------- Utility Functions (Moved to Top) ---------- */

/**
 * Checks if text contains high-impact keywords
 */
function checkKeywords(title, description) {
    if (!title || !description) return false;

    const text = (title + " " + description).toLowerCase();

    return KEYWORDS.some(keyword => {
        if (!keyword) return false;
        return text.includes(keyword.toLowerCase());
    });
}

/**
 * Cleans HTML tags from description
 */
function cleanDescription(html) {
    if (!html) return "";
    return html.replace(/<[^>]*>?/gm, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
}

/**
 * Simple string hash for ID generation
 */
function hash(value) {
    let h = 0;
    if (!value) return "0";
    for (let i = 0; i < value.length; i++) {
        h = (h << 5) - h + value.charCodeAt(i);
        h |= 0;
    }
    return h.toString();
}

/**
 * Cleans source name
 */
function cleanSource(sourceName) {
    if (!sourceName) return "Unknown";

    // Fix for Google News Search feeds where title is "Query - Google News"
    if (sourceName.includes(" - Google News")) {
        return "Google News";
    }

    // Search for known keys in the source name
    const foundKey = Object.keys(SOURCE_METRICS).find(key =>
        key !== 'default' && sourceName.toLowerCase().includes(key.toLowerCase())
    );
    return foundKey ? SOURCE_METRICS[foundKey].name : sourceName;
}

/**
 * Generates a "Critic's One Liner" heuristic from title/description
 */
/**
 * Generates a "Critic's One Liner" heuristic from title/description
 */
function generateCriticsOneLiner(title, description, source) {
    const text = (title + " " + description).toLowerCase();

    // 1. Sector-Specific Insights
    if (/\bsensex\b|\bnifty\b|\bmarket\b/i.test(text)) {
        if (/\brecord high\b|\bsurge\b|\bjump\b/i.test(text)) {
            return `Bullish sentiment prevails as key indices hit significant milestones; analysts watch for profit booking.`;
        }
        if (/\bslump\b|\bcrash\b|\bdrop\b/i.test(text)) {
            return `Market volatility spikes amid global cues; institutional investors remain cautious.`;
        }
        return `Financial observers highlight the underlying strength despite mixed global signals in the equity space.`;
    }

    if (/\belection\b|\bpoll\b|\bvote\b/i.test(text)) {
        return `Political strategists emphasize the shifting dynamic as latest polling data suggests a tightening race.`;
    }

    // Strict regex for AI to avoid matching 'air', 'said', etc.
    if (/\b(ai|artificial intelligence)\b/i.test(text) || /\btech\b/i.test(text)) {
        return `Industry experts view this as a pivotal move in the ongoing race for AI supremacy and infrastructure.`;
    }

    if (/\binflation\b|\brbi\b|\binterest rate\b/i.test(text)) {
        return `Monetary policy experts weigh the impact of fiscal pressures on long-term consumer spending patterns.`;
    }

    // 2. Structural Extractions
    // If description has a clear quote, use it
    const quoteMatch = description.match(/"([^"]{20,100})"/);
    if (quoteMatch) return `"${quoteMatch[1]}"`;

    // 3. Narrative Heuristics
    if (title.includes('?')) {
        return `This development raises critical questions about the future trajectory of the sector.`;
    }

    // 4. No generic fallback - return null to hide component
    return null;
}

export function computeImpactScore(item, section) {
    const scoringSettings = getSettings();
    const w = scoringSettings.rankingWeights || {};

    // 1. Freshness Decay (Linear)
    // 24 hours = 0 score. 0 hours = 1 score.
    const ageInHours = (Date.now() - item.publishedAt) / (1000 * 60 * 60);
    const decayHours = w.freshness?.decayHours || 26;
    const maxBoost = w.freshness?.maxBoost || 3;
    const freshness = Math.max(0, (decayHours - ageInHours) / decayHours) * maxBoost;

    // 2. Source Weight and Category Relevance (NEW)
    const sourceScore = calculateSourceScore(item.source);
    const categoryWeight = getSourceWeightForCategory(item.source, section);
    // Combined source component, scaled up
    const tierBoost = w.source?.tier1Boost || 5;
    const sourceComponent = sourceScore * categoryWeight * tierBoost;

    // 3. Keyword Context Boost
    const kwMatchBoost = w.keyword?.matchBoost || 2;
    const keywordBoost = checkKeywords(item.title, item.description) ? kwMatchBoost : 0;

    // 4. Section Priority
    const sectionPriority = section === "world" ? 1.5 : section === "business" ? 1.2 : 1;

    // 5. Sentiment Boost
    let sentimentBoost = 0;
    if (item.sentiment) {
        if (item.sentiment.label === 'positive') sentimentBoost = w.sentiment?.positiveBoost || 0.5;
        else if (item.sentiment.label === 'negative') sentimentBoost = w.sentiment?.negativeBoost || 0.3;
    }

    // Breaking News Detection (Phase 5)
    const breakingResult = breakingDetector.checkBreakingNews(item);
    item.isBreaking = breakingResult.isBreaking;
    item.breakingScore = breakingResult.breakingScore;
    const breakingBoost = breakingResult.multiplier;

    // --- NEW SCORING LOGIC CHECK ---
    if (scoringSettings.enableNewScoring === false) {
        // ORIGINAL SCORING (Status Quo)
        return (freshness + sourceComponent + keywordBoost + sentimentBoost) * sectionPriority * breakingBoost;
    }

    // --- NEW SCORING LOGIC (9-Factor) ---
    // Calculate new multipliers
    const impactMultiplier = calculateImpactScore(item.title, item.description);
    const proximityMultiplier = calculateProximityScore(item.title, item.description);
    const noveltyMultiplier = calculateNoveltyScore(item.title, item.description, section);
    // Note: passing null for keywords array as it's not currently extracted in normalizeItem
    const currencyMultiplier = calculateCurrencyScore(item.title, null);
    const humanInterestMultiplier = calculateHumanInterestScore(item.title, item.description);
    const visualMultiplier = calculateVisualScore(item.imageUrl, scoringSettings); // Pass settings!

    // Base Score (Sum of additive components)
    const baseScore = freshness + sourceComponent + keywordBoost + sentimentBoost;

    // Multipliers (Product of multiplicative components)
    const multipliers = impactMultiplier * proximityMultiplier * noveltyMultiplier *
        currencyMultiplier * humanInterestMultiplier * visualMultiplier;

    // --- TEMPORAL BOOSTS (Phase 9) ---
    // Apply configured boosts for Weekend and Entertainment
    let temporalMultiplier = 1.0;
    const now = new Date();
    const day = now.getDay();
    const isWeekend = (day === 0 || day === 6 || day === 5); // Fri, Sat, Sun

    // 1. Entertainment Boost (Always active for target sections)
    if (['entertainment', 'social', 'movies'].includes(section) || item.section === 'entertainment') {
        const entBoost = scoringSettings.rankingWeights?.temporal?.entertainmentBoost || 2.5;
        temporalMultiplier *= entBoost;
    }

    // 2. Weekend Boost (Active on Fri-Sun for leisure/local content)
    if (isWeekend) {
        if (['entertainment', 'social', 'local', 'chennai', 'trichy', 'events'].includes(section)) {
            const wkndBoost = scoringSettings.rankingWeights?.temporal?.weekendBoost || 2.0;
            temporalMultiplier *= wkndBoost;
        }
    }

    // Final Calculation with multipliers
    const total = baseScore * multipliers * temporalMultiplier * sectionPriority * breakingBoost;

    return total;
}

function isSourceAllowed(sourceName, allowedSources) {
    // If allowedSources is passed, we check if the source is enabled.
    let matchedKey = null;

    // Check mapping
    for (const [key, name] of Object.entries(SETTINGS_MAPPING)) {
        if (sourceName.includes(name) || name.includes(sourceName)) {
            matchedKey = key;
            break;
        }
    }

    if (matchedKey) {
        return allowedSources[matchedKey] !== false;
    }
    return true;
}

/* ---------- Public API ---------- */

/**
 * Fetches news for a given section.
 */
export async function fetchSectionNews(section, limit = 10, allowedSources = null) {
    const _t0 = Date.now();
    // Optimization: If limit is 0, don't fetch anything
    if (limit === 0) return [];

    const cacheKey = section;
    let items = [];

    // Check if cache is enabled in settings (Phase 6)
    const settings = getSettings();
    const cacheEnabled = settings.enableCache !== false; // Default to true

    // Check cache first if enabled
    if (cacheEnabled) {
        const cached = memoryCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
            const ageSeconds = Math.round((Date.now() - cached.timestamp) / 1000);
            console.log(`[RSS] ✅ Cache HIT for ${section} (age: ${ageSeconds}s)`);
            return rankAndFilter(cached.data, section, limit, allowedSources);
        }
        console.log(`[RSS] ⚠️ Cache MISS for ${section} - Fetching fresh data`);
    } else {
        console.log(`[RSS] ℹ️ Cache DISABLED by user settings for ${section}`);
    }

    // Special handling for entertainment section
    if (section === 'entertainment') {
        console.log('[RSS] Using entertainmentService for entertainment section');
        try {
            const entSettings = getSettings();
            const entertainmentSettings = entSettings?.entertainment || {};
            const articles = await fetchAllEntertainment(entertainmentSettings);
            console.log(`[RSS] Entertainment: Got ${articles.length} articles with distribution`);
            return articles.slice(0, limit);
        } catch (error) {
            console.error('[RSS] Entertainment service failed:', error);
            // Fallback to regular RSS feeds
        }
    }

    const feeds = SECTION_FEEDS[section] || [];

    if (feeds.length === 0) {
        console.warn(`[RSS] No feeds defined for section: ${section}`);
        return [];
    }

    try {
        console.log(`[RSS] Feeds for ${section}:`, feeds);

        // Track failures per feed
        const results = await Promise.allSettled(
            feeds.map(url => fetchAndParseFeed(url, section))
        );

        const successfulResults = [];
        const failedFeeds = [];

        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                successfulResults.push(result.value);
                console.log(`[RSS] ✅ Feed ${index + 1}/${feeds.length} succeeded`);
            } else {
                failedFeeds.push(feeds[index]);
                console.warn(`[RSS] ⚠️ Feed ${index + 1}/${feeds.length} failed: ${result.reason?.message || 'Unknown error'}`);
            }
        });

        // Retry Logic: Only retry if some succeeded (indicating network is OK) but not all failed
        if (failedFeeds.length > 0 && successfulResults.length > 0) {
            console.log(`[RSS] Retrying ${failedFeeds.length} failed feed(s) for ${section}...`);
            await new Promise(r => setTimeout(r, 2000)); // 2-second delay

            const retryResults = await Promise.allSettled(
                failedFeeds.map(url => fetchAndParseFeed(url, section))
            );

            retryResults.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    successfulResults.push(result.value);
                    console.log(`[RSS] ✅ Retry succeeded: ${failedFeeds[index]}`);
                } else {
                    console.error(`[RSS] ❌ Retry also failed: ${failedFeeds[index]}`);
                }
            });
        }

        items = successfulResults.flat();

        const _dur = Date.now() - _t0;
        console.log(`[RSS] Section '${section}' stats:`, {
            totalFeeds: feeds.length,
            successCount: successfulResults.length,
            failureCount: feeds.length - successfulResults.length,
            totalItems: items.length
        });
        logStore.success('rss', `${section}: ${items.length} items from ${successfulResults.length}/${feeds.length} feeds`, { durationMs: _dur });

        // Only cache if enabled (Phase 6)
        if (settings.enableCache !== false) {
            memoryCache.set(cacheKey, {
                timestamp: Date.now(),
                data: items
            });
            console.log(`[RSS] 💾 Cached ${items.length} items for ${section}`);
        }


    } catch (error) {
        console.error(`[RSS] Unexpected error fetching section ${section}:`, {
            errorMessage: error.message,
            errorStack: error.stack,
            section
        });
        logStore.error('rss', `${section}: ${error.message}`, { durationMs: Date.now() - _t0 });

        // Return partial results if some succeeded
        if (items.length > 0) return items;
        return [];
    }

    // Always apply filtering/ranking
    try {
        const rankedItems = await rankAndFilter(items, section, limit, allowedSources);

        // Ensure sourceCount is populated (defensive check for consensus audit)
        rankedItems.forEach(item => {
            if (!item.sourceCount) item.sourceCount = 1;
        });

        // --- Section Health Monitoring ---
        const health = getSectionHealth(section, rankedItems.length);
        recordFetchCount(section, rankedItems.length);

        // Attach health metadata to the array (avoid breaking array consumers)
        rankedItems.health = health;
        rankedItems.isSingleSource = checkSingleSource(rankedItems);

        return rankedItems;

    } catch (error) {
        console.error(`[RSS] Ranking failed for ${section}:`, error);
        // Fallback: return unsorted items rather than crashing
        const fallbackItems = items.slice(0, limit);

        // Best effort health tracking for fallback
        recordFetchCount(section, fallbackItems.length);

        return fallbackItems;
    }
}

/* ---------- Core Logic ---------- */

export async function fetchAndParseFeed(feedUrl, section) {
    // Delegate to ProxyManager for rotation and failover
    // ProxyManager returns { title: string, items: Array<RawItem> }
    const { title: feedTitle, items } = await proxyManager.fetchViaProxy(feedUrl);

    // Normalize items to internal application structure
    // This includes scoring, sentiment analysis (if applicable), and cleaning
    return items.map(item => normalizeItem(item, feedTitle, section));
}

function normalizeItem(item, feedSource, section = 'general') {
    const pubDateStr = item.pubDate || item.created || new Date().toISOString();
    const publishedAt = Date.parse(pubDateStr) || Date.now();

    let source = feedSource;
    if (item.author) source = item.author;
    source = cleanSource(source);

    const articleId = hash(item.link || item.guid || item.title);
    const description = item.description || "";

    // Dynamic Section Classification
    const detectedSection = classifySection(item.title || '', description || '', source);
    // If classification found a match, use it. Otherwise, stick to the feed's section.
    const finalSection = detectedSection || section;

    // NEW - Phase 7: Image Extraction
    let imageUrl = null;

    // Method 1: RSS enclosure (most common)
    if (item.enclosure && item.enclosure.url) {
        imageUrl = item.enclosure.url;
    }
    // Method 2: media:thumbnail (MediaRSS)
    else if (item.thumbnail) {
        imageUrl = item.thumbnail;
    }
    // Method 3: media:content
    else if (item['media:content'] && item['media:content'].url) {
        imageUrl = item['media:content'].url;
    }
    // Method 4: Extract from description HTML
    else if (description.includes('<img')) {
        const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch) {
            imageUrl = imgMatch[1];
        }
    }

    // Validate image URL
    if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = null; // Reject invalid URLs
    }

    const isFinanceRelated = ['business', 'market'].includes(section) ||
        /\b(stock|market|shares|trading|sensex|nifty|bank|economy|crypto|ipo|revenue|profit)\b/i.test(item.title + description);

    let sentimentData = null;
    if (isFinanceRelated) {
        sentimentData = analyzeArticleSentiment(item.title, cleanDescription(description));
    }

    return {
        id: articleId,
        title: item.title,
        headline: item.title,
        description: description,
        summary: cleanDescription(description),
        link: item.link,
        url: item.link,
        source: source,
        publishedAt: publishedAt,
        fetchedAt: Date.now(),
        time: new Date(publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        impactScore: 0,
        section: finalSection, // Use the classified section
        criticsView: generateCriticsOneLiner(item.title, cleanDescription(description), source),
        sentiment: sentimentData ? {
            label: sentimentData.label,
            comparative: sentimentData.comparative,
            titleSentiment: sentimentData.titleSentiment,
            descriptionSentiment: sentimentData.descriptionSentiment
        } : null,
        imageUrl: imageUrl  // NEW - Phase 7
    };
}

async function rankAndFilter(items, section, limit, allowedSources) {
    try {
        const seen = new Set();
        const now = Date.now();

        const settings = getSettings();
        // Use new setting hideOlderThanHours, fallback to legacy freshnessLimitHours
        const limitHours = settings.hideOlderThanHours || settings.freshnessLimitHours || 60;
        const MAX_AGE_MS = limitHours * 60 * 60 * 1000;
        const bypassFreshness = settings.strictFreshness === false; // If strict is off, bypass
        const shouldScore = settings.rankingMode !== 'legacy'; // Optimization: Skip scoring in Legacy mode

        console.log(`[RSSDebug] filtering for ${section}: Limit=${limitHours}h. Items=${items.length}`);

        const preProcessed = items
            .filter(item => {
                // 1. Freshness Filter (Strict)
                if (!bypassFreshness && (now - item.publishedAt > MAX_AGE_MS)) return false;

                // 2. Filtering Mode (Source vs Keyword)
                if (settings.filteringMode === 'keyword') {
                    // Strict Keyword Mode: Must match high-impact keywords
                    if (!checkKeywords(item.title, item.description)) return false;
        } else if (settings.topWebsitesOnly) {
             // Phase 8: Top Websites Only Mode
             const TOP_SOURCES = ['BBC', 'Reuters', 'NDTV', 'The Hindu', 'Times of India', 'Moneycontrol'];
             if (!TOP_SOURCES.some(s => item.source.includes(s))) return false;
                } else {
                    // Source Mode (Default): Check allowlist
                    if (allowedSources && !isSourceAllowed(item.source, allowedSources)) return false;
                }

                return true;
            })
            .map(item => {
                // Use the item's section (which might have been re-classified)
                // or fallback to the requested section if missing
                const itemSection = item.section || section;

                // Optimization: In Legacy mode, skip expensive scoring
                // Default to 0, sorting will rely on pubDate
                const score = shouldScore ? computeImpactScore(item, itemSection) : 0;

                return {
                    ...item,
                    section: itemSection,
                    impactScore: score
                };
            })
            .filter(item => {
                if (seen.has(item.id)) return false;
                seen.add(item.id);
                return true;
            });

        const clustered = deduplicateAndCluster(preProcessed, 0.75);

        // Ranking Mode
        if (settings.rankingMode === 'legacy') {
            clustered.sort((a, b) => b.publishedAt - a.publishedAt);
        } else {
            // Default 'smart'
            clustered.sort((a, b) => b.impactScore - a.impactScore);
        }

        console.log(`[RSS] Final count for ${section}: ${clustered.length} (requested ${limit})`);
        return clustered.slice(0, limit);

    } catch (error) {
        console.error(`[RSS] Ranking error for ${section}:`, error);
        throw error;
    }
}

/* ---------- Cache Management API (Phase 6) ---------- */

/**
 * Get cache statistics for debugging
 * @returns {Object} Cache stats including entries and ages
 */
export function getCacheStats() {
    const stats = {
        totalEntries: memoryCache.size,
        cacheEnabled: getSettings().enableCache !== false,
        cacheTTL: CACHE_TTL_MS / 1000, // in seconds
        entries: []
    };

    memoryCache.forEach((value, key) => {
        const ageSeconds = Math.round((Date.now() - value.timestamp) / 1000);
        stats.entries.push({
            section: key,
            ageSeconds,
            itemCount: value.data?.length || 0,
            isExpired: ageSeconds > (CACHE_TTL_MS / 1000)
        });
    });

    return stats;
}

/**
 * Clear all cached news data
 * Useful when settings change or manual refresh needed
 */
export function clearNewsCache() {
    const size = memoryCache.size;
    memoryCache.clear();
    console.log(`[RSS] 🗑️ Cleared ${size} cache entries`);
    return size;
}
