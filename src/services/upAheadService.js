import { proxyManager } from './proxyManager.js';
import logStore from '../utils/logStore.js';
import { extractDate, expandDateKeys } from '../utils/dateExtractor.js';
import plannerStorage from '../utils/plannerStorage.js';

// ============================================================
// SMART KEYWORD FILTERS FOR PLANNING
// The "Up Ahead" planner needs FORWARD-LOOKING, ACTIONABLE items.
// We filter in three layers:
//   1. Global negative: Drop backward-looking noise (reviews, opinions, crime)
//   2. Forward-looking signals: Boost/require temporal action words
//   3. Category-specific positive: Fine-grained relevance per section
// ============================================================

// Word-boundary matching to prevent substring collisions
// e.g. "review" must NOT match "preview", "dating" must NOT match "updating"
const _wbCache = new Map();
function matchesWord(text, word) {
    let re = _wbCache.get(word);
    if (!re) {
        // Escape regex special chars, then wrap in word boundaries
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        re = new RegExp(`\\b${escaped}\\b`, 'i');
        _wbCache.set(word, re);
    }
    return re.test(text);
}

// For multi-word phrases, use includes() (no boundary issues)
// For short/ambiguous single words, use matchesWord()
function matchesKeyword(text, keyword) {
    if (keyword.includes(' ')) {
        return text.includes(keyword);
    }
    return matchesWord(text, keyword);
}

// --- LAYER 1: Global Negative Keywords ---
// These words almost NEVER appear in actionable, plannable content.
// Grouped by noise type for maintainability.
const NEGATIVE_KEYWORDS = {
    // Backward-looking commentary — articles ABOUT things, not things TO DO
    // NOTE: "review" uses word-boundary matching via matchesKeyword() so
    // "preview" is NOT caught. Same for other short words.
    commentary: [
        "review", "reviewed", "reviews",
        "opinion", "editorial", "column", "op-ed",
        "analysis", "deep dive", "explainer", "explained",
        "interview", "memoir", "podcast", "recap",
        "retrospective", "lookback", "throwback"
    ],
    // Celebrity/gossip noise — never plannable
    gossip: [
        "gossip", "rumour", "rumor", "spotted", "dating",
        "divorce", "controversy", "trolled", "slammed",
        "reacts", "reaction", "claps back", "feud",
        "leaked", "wardrobe malfunction", "breakup"
    ],
    // Crime & tragedy — not events you plan for
    crime: [
        "arrested", "murder", "stabbed", "robbery",
        "scam", "fraud", "accused", "chargesheet",
        "sentenced", "bail", "fir filed", "kidnap",
        "suicide", "death toll", "fatal"
    ],
    // Finance noise that bleeds in via "shares" / "market" queries
    finance_noise: [
        "quarterly results", "earnings call", "dividend",
        "stock split", "ipo allotment", "listing gains",
        "shareholding pattern", "promoter stake",
        "mutual fund nav", "portfolio rebalancing"
    ],
    // Political noise (not civic alerts — those are kept)
    political_noise: [
        "alleges", "slams", "hits out", "war of words",
        "defamation", "no confidence", "horse trading",
        "exit poll", "poll prediction", "meme"
    ],
    // Past-tense signals — the event already happened
    past_tense: [
        "was held", "concluded", "wrapped up",
        "came to an end", "successfully completed",
        "inaugurated by", "flagged off",
        "took place", "was celebrated"
    ],
    // Obituaries & tragedy — not plannable
    obituary: [
        "passes away", "passed away", "demise", "rip",
        "condolences", "last rites", "funeral",
        "pays tribute", "mourns", "obituary"
    ],
    // Listicles & editorial roundups — not events
    listicle: [
        "top 10", "top 5", "best of", "worst of",
        "reasons why", "things you", "ranked",
        "all you need to know", "everything we know"
    ],
    // Box office / collection reports — backward-looking movie stats
    collection_reports: [
        "box office collection", "day 1 collection",
        "total collection", "worldwide gross",
        "opening weekend", "first week collection",
        "crosses crore", "nett collection"
    ],
    // Clickbait & sensationalism
    clickbait: [
        "shocking", "you won't believe", "jaw dropping",
        "gone viral", "breaks the internet", "exclusive"
    ]
};

// Flatten for fast lookup
const ALL_NEGATIVE_KEYWORDS = Object.values(NEGATIVE_KEYWORDS).flat();

// --- LAYER 2: Forward-Looking Signal Words ---
// If an article contains these, it's MORE likely to be plannable.
// Used as a soft boost (not strict requirement) — items with these
// get priority even if they lack an extracted date.
const FORWARD_LOOKING_SIGNALS = [
    // Temporal signals — something is COMING
    "upcoming", "scheduled", "starting", "launches", "opens",
    "begins", "commences", "from today", "this weekend",
    "next week", "releasing", "premieres", "debuts",
    "kicks off", "set to", "slated for", "expected on",
    "effective from", "valid till", "last date", "deadline",
    "registrations open", "bookings open", "doors open",

    // Action signals — you can DO something
    "book now", "tickets available", "grab your", "register",
    "rsvp", "sign up", "enroll", "apply before",
    "limited seats", "early bird", "pre-order",
    "advance booking", "buy tickets", "entry free",

    // Venue/location signals — implies a physical event
    "venue", "stadium", "auditorium", "convention centre",
    "exhibition hall", "multiplex", "arena", "grounds",

    // Schedule signals — structured timing
    "schedule", "timetable", "lineup", "itinerary",
    "match day", "race day", "show timings", "showtimes",
    "time slot", "batch"
];

// --- LAYER 3: Category-Specific Positive Keywords ---
// These define what COUNTS as relevant within each category.
// An item must match at least one positive keyword for its category
// to pass the relevance filter.
const CATEGORY_POSITIVE_KEYWORDS = {
    movies: [
        // Release signals
        "release date", "releasing", "in theatres", "in theaters",
        "first day", "advance booking", "fdfs",
        "premiere", "preview", "sneak peek", "special screening",
        // OTT signals
        "ott release", "streaming from", "now streaming",
        "available on", "direct to ott", "digital premiere",
        // Booking signals
        "tickets", "showtimes", "book now", "bookmyshow",
        "ticketnew", "paytm movies",
        // Trailer as a plannable event
        "trailer launch", "teaser release", "motion poster"
        // NOTE: "box office" removed — too ambiguous (matches collection reports)
    ],
    events: [
        // Performance types
        "concert", "live music", "standup", "comedy show",
        "theatre", "theater", "drama", "stage play",
        "dance recital", "sabha", "kutcheri", "kutchery",
        // Exhibitions & fairs
        "exhibition", "expo", "book fair", "trade fair",
        "flea market", "art gallery", "trade show",
        // Workshops & learning
        "workshop", "masterclass", "bootcamp", "seminar",
        "webinar", "hackathon", "meetup",
        // Food & lifestyle
        "food festival", "pop-up", "tasting", "brunch",
        "food walk", "heritage walk", "night market",
        // Ticketed experiences
        "entry fee", "passes available", "gate open",
        "limited slots", "registration"
        // NOTE: "play" removed (matches "player", "playing", "display")
        // NOTE: "fair" removed (matches "affair", "unfair"); use "book fair", "trade fair" etc.
    ],
    sports: [
        // Match signals — " vs " with spaces to avoid substring collisions
        " vs ", " v/s ", "match", "fixture", "squad announced",
        "playing xi", "toss", "innings",
        // Tournament signals
        "schedule", "points table", "qualifier",
        "semi final", "final", "playoffs",
        // Venue/broadcast
        "stadium", "live on", "broadcast", "streaming",
        "start time", "kick off", "first ball"
        // NOTE: bare "vs" removed (2 chars, matches substrings)
    ],
    festivals: [
        // Calendar markers
        "holiday", "bank holiday", "gazetted",
        "declared holiday", "government holiday",
        // Festival names act as positive signals
        "pongal", "diwali", "deepavali", "navratri",
        "dussehra", "eid", "ramadan", "christmas",
        "onam", "vishu", "ugadi", "holi", "ganesh",
        "jayanti", "puja", "pooja", "thai pusam",
        // Observance signals
        "observed on", "falls on", "celebrated on",
        "auspicious", "muhurtham", "tithi"
    ],
    shopping: [
        // Sale signals
        "sale", "mega sale", "flash sale", "clearance",
        "end of season", "flat discount", "upto off",
        "cashback", "coupon", "promo code",
        // Event-based shopping
        "shopping festival", "exhibition sale",
        "trade fair", "grand opening",
        // Time-bound urgency
        "limited period", "ends today", "last day",
        "offer valid", "while stocks last", "hurry"
    ],
    alerts: [
        // Infrastructure disruptions
        "power cut", "power shutdown", "load shedding",
        "tangedco", "tneb", "scheduled maintenance",
        "water cut", "water supply", "disruption",
        // Traffic & transport
        "traffic advisory", "road closure", "diversion",
        "metro shutdown", "bus route change",
        "train cancelled", "flight delayed",
        // Civic notices
        "boil water advisory", "mosquito fogging",
        "tree trimming", "construction zone"
    ],
    weather_alerts: [
        // Severity signals
        "warning", "alert", "advisory", "watch",
        "red alert", "orange alert", "yellow alert",
        // Weather phenomena
        "heavy rain", "very heavy rain", "cyclone",
        "thunderstorm", "heat wave", "cold wave",
        "fog", "flooding", "high tide", "storm surge",
        // Official sources
        "imd", "met department", "weather bulletin"
    ],
    civic: [
        // VIP disruptions (plan around them)
        "vip movement", "vip visit", "road block",
        "security arrangement", "route change",
        // Protests & closures
        "bandh", "hartal", "strike", "protest march",
        "rasta roko", "rail roko",
        // Government actions
        "corporation notice", "tender", "public hearing",
        "ward meeting", "grievance day"
    ]
};

// Configuration for search queries based on categories
const CATEGORY_QUERIES = {
    movies: [
        'Tamil movie release this week',
        'new movie release OTT',
        'BookMyShow Chennai movies',
        'upcoming movies Kollywood',
        'movie tickets showtimes'
    ],
    events: [
        // General Events
        'Chennai events this week',
        'LiveChennai events',
        'concert tickets Chennai',
        'standup comedy show Chennai',
        'exhibition workshops Chennai',
        'things to do Chennai weekend',
        'Muscat events this week',
        'Muscat concerts exhibitions',
        // Entertainment (Merged)
        'theatre shows Chennai this week',
        'art exhibition Chennai',
        'food festival Chennai',
        'cultural event Chennai',
        'music sabha Chennai',
        'Muscat Royal Opera House events'
    ],
    festivals: [
        'upcoming festivals Tamil Nadu 2026',
        'bank holidays India upcoming',
        'public holidays Tamil Nadu',
        'religious festivals this month India',
        'Oman festivals holidays'
    ],
    alerts: [
        'TANGEDCO power cut Chennai tomorrow',
        'TNEB power shutdown schedule',
        'Chennai traffic advisory today',
        'Chennai metro maintenance',
        'water supply disruption Chennai',
        'road closure Chennai'
    ],
    weather_alerts: [
        'IMD Chennai weather warning',
        'Tamil Nadu heavy rain alert',
        'cyclone warning Chennai',
        'heat wave advisory Tamil Nadu',
        'Oman weather warning Muscat'
    ],
    sports: [
        'IPL 2026 schedule matches',
        'cricket match Chennai CSK',
        'ISL football match schedule',
        'Pro Kabaddi schedule',
        'sports events Chennai this week'
    ],
    shopping: [
        'Chennai sale offers discount today',
        'exhibition sale Chennai',
        'Pongal sale Tamil Nadu',
        'Diwali offers Chennai',
        'end of season sale Chennai mall',
        'Muscat shopping festival offers'
    ],
    civic: [
        'VIP visit Chennai road closure',
        'minister visit Tamil Nadu traffic',
        'protest bandh Chennai tomorrow',
        'Chennai corporation announcement',
        'Muscat road closure traffic'
    ]
};

// Standard RSS feeds to supplement search queries
const STATIC_FEEDS = {
    movies: [
        "https://www.hindustantimes.com/feeds/rss/entertainment/tamil-cinema/rssfeed.xml",
        "https://www.hindustantimes.com/feeds/rss/entertainment/bollywood/rssfeed.xml"
    ],
    sports: [
        "https://www.espn.com/espn/rss/news"
    ],
    festivals: [
        "https://www.timeanddate.com/holidays/india/feed"
    ],
    events: [
        "https://www.thehindu.com/news/cities/chennai/feeder/default.rss"
    ]
};

/**
 * Main function to fetch Up Ahead data based on user settings
 * @param {Object} settings - { categories: { movies: true... }, locations: ['Chennai', 'Muscat'], hideOlderThanHours: 60 }
 */
export async function fetchUpAheadData(settings) {
    const _t0 = Date.now();
    console.log('[UpAheadService] Fetching data with settings:', settings);

    const categories = settings?.categories || { movies: true, events: true, festivals: true, alerts: true, sports: true };
    const locations = settings?.locations && settings.locations.length > 0 ? settings.locations : ['Chennai', 'India']; // Default fallback

    let allItems = [];

    // 1. Build list of RSS/Search URLs
    const urlsToFetch = [];

    // Helper to add Google News Search URL
    const addSearchUrl = (query) => {
        const encoded = encodeURIComponent(query);
        // Using "when:7d" to ensure freshness
        urlsToFetch.push({
            url: `https://news.google.com/rss/search?q=${encoded}+when:7d&hl=en-IN&gl=IN&ceid=IN:en`,
            type: 'search',
            originalQuery: query
        });
    };

    // Iterate categories and locations
    for (const [cat, isEnabled] of Object.entries(categories)) {
        if (!isEnabled) continue;

        // A. Add Static Feeds for this category (if any)
        if (STATIC_FEEDS[cat]) {
            STATIC_FEEDS[cat].forEach(url => {
                urlsToFetch.push({ url, type: 'static', category: cat });
            });
        }

        // B. Add Search Queries (combined with locations for relevance)
        const queries = CATEGORY_QUERIES[cat] || [];
        queries.forEach(baseQuery => {
            // Add location-specific queries (e.g., "events happening this week Chennai")
            if (cat === 'events' || cat === 'alerts' || cat === 'movies') {
                locations.forEach(loc => {
                    // Skip "India" for hyper-local categories to avoid noise (e.g. "Traffic Advisory India" -> fetches Thane/Mumbai news)
                    if (loc.toLowerCase() === 'india' && (cat === 'alerts' || cat === 'events')) {
                        return;
                    }
                    addSearchUrl(`${baseQuery} ${loc}`);
                });
            } else {
                 // For sports/festivals, location might be less strict or handled by "India"
                 addSearchUrl(`${baseQuery}`);
            }
        });
    }

    // Deduplicate URLs
    const uniqueUrls = [...new Map(urlsToFetch.map(item => [item.url, item])).values()];

    console.log(`[UpAheadService] Prepared ${uniqueUrls.length} feeds to fetch.`);

    // 2. Fetch All Feeds in Parallel
    const fetchPromises = uniqueUrls.map(async (feedConfig) => {
        try {
            // Using proxyManager directly to get raw items, then processing
            const { items } = await proxyManager.fetchViaProxy(feedConfig.url);

            // Map items to our structure immediately
            return items.map(item => normalizeUpAheadItem(item, feedConfig));
        } catch (error) {
            console.warn(`[UpAheadService] Failed to fetch ${feedConfig.url}:`, error.message);
            return [];
        }
    });

    const results = await Promise.all(fetchPromises);
    allItems = results.flat();

    // 3. Process, Deduplicate, and Organize
    const organizedData = processUpAheadData(allItems, settings);

    // 4. Persist items with extracted dates into planner storage
    try {
        for (const item of allItems) {
            if (item.extractedDate) {
                const dateResult = extractDate(
                    `${item.title} ${item.description || ''}`,
                    item.pubDate
                );
                if (dateResult) {
                    const keys = expandDateKeys(dateResult);
                    if (keys.length > 0) {
                        plannerStorage.merge(keys, [{ id: item.id, title: item.title, category: item.category, link: item.link }]);
                    }
                }
            }
        }
    } catch (e) {
        console.warn('[UpAhead] Planner storage write failed', e);
    }

    const _dur = Date.now() - _t0;
    const timelineCount = organizedData?.timeline?.reduce((s, d) => s + (d.items?.length || 0), 0) || 0;
    logStore.success('upAhead', `${timelineCount} items from ${uniqueUrls.length} feeds`, { durationMs: _dur });

    return organizedData;
}

/**
 * Normalizes an RSS item into an Up Ahead item
 */
function stripHtml(html) {
    if (!html) return "";
    let text = html.toString();

    // Decode common entities first
    const entities = {
        '&nbsp;': ' ',
        '&amp;': '&',
        '&quot;': '"',
        '&#39;': "'",
        '&lt;': '<',
        '&gt;': '>'
    };

    text = text.replace(/&[a-z0-9#]+;/gi, (match) => entities[match] || match);

    // Remove scripts and styles
    text = text.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, "");
    text = text.replace(/<style[^>]*>([\S\s]*?)<\/style>/gmi, "");

    // Remove all HTML tags
    text = text.replace(/<\/?[^>]+(>|$)/g, "");

    return text.trim();
}

export function normalizeUpAheadItem(item, config) {
    const title = stripHtml(item.title || '');
    // Keep HTML in description for parsing lists/tables if needed
    // But for general fullText search, we strip it
    const rawDescription = item.description || '';
    const description = stripHtml(rawDescription);
    const fullText = `${title} ${description}`;

    let pubDate = item.pubDate ? new Date(item.pubDate) : null;
    // Ensure Invalid Date objects become null
    if (pubDate && isNaN(pubDate.getTime())) {
        pubDate = null;
    }

    // 5-layer date extraction (new engine), with legacy fallback
    let extractedDate = null;
    const newDateResult = extractDate(fullText, pubDate);
    if (newDateResult?.start) {
        extractedDate = newDateResult.start;
    } else {
        extractedDate = extractFutureDate(fullText, pubDate);
    }

    // Determine Category (if not already known from config)
    let category = config.category;
    if (!category || config.type === 'search') {
        category = detectCategory(fullText);
    }

    // Check for Roundup List
    let subItems = [];
    let isRoundup = false;

    // Detect if this is likely a roundup article
    if (/ott|releases|week/i.test(title) && /\d+ new/i.test(title)) {
        isRoundup = true;
    }

    if (isRoundup && category === 'movies') {
        // Try parsing description immediately
        subItems = parseRoundupContent(rawDescription, pubDate);

        // If description didn't yield items (often truncated RSS), we MIGHT need to fetch full content.
        // But for now, client-side, we can't easily fetch full HTML without CORS issues or a heavy proxy.
        // We will mark it as a roundup so the UI can handle it (e.g. "Click to see 33 items")
    }

    return {
        id: item.guid || item.link || title,
        title: title,
        link: item.link,
        description: description,
        pubDate: pubDate, // Store as Date object or null
        extractedDate: extractedDate, // This is the crucial "Event Date"
        category: category,
        rawSource: config.originalQuery || 'feed',
        isRoundup: isRoundup,
        subItems: subItems // Array of { title, date, platform }
    };
}

/**
 * Heuristic Parser for OTT Roundups
 * Extracts items like "Movie Name (Platform) - Date" or from HTML Lists
 */
function parseRoundupContent(html, contextDate) {
    const items = [];

    // 1. Text-based Line Parsing (for plain descriptions)
    // Looking for patterns like: "1. Movie Name (Netflix) - Feb 5" or "• Movie Name - Platform"
    const lines = html.split(/<br\s*\/?>|\n|<\/li>|<\/p>|•/i);

    const ottPlatforms = ['netflix', 'prime', 'prime video', 'hotstar', 'sony liv', 'zee5', 'jiocinema', 'aha', 'sunnxt', 'hulu', 'disney'];
    // Sort by length desc to match "prime video" before "prime"
    const platformRegex = new RegExp(`\\b(${ottPlatforms.sort((a,b) => b.length - a.length).join('|')})\\b`, 'i');

    lines.forEach(line => {
        const cleanLine = stripHtml(line).trim();
        if (cleanLine.length < 5) return;

        // Must match a platform OR contain a date
        const hasPlatform = platformRegex.test(cleanLine);
        const date = extractFutureDate(cleanLine, contextDate);

        if (hasPlatform || date) {
            // Cleanup title: remove numbering "1. ", " - ", dates, platforms
            let title = cleanLine
                .replace(/^\d+\.\s*/, '') // Remove "1. "
                .replace(/^[-\u2013\u2014]\s*/, '') // Remove leading dash
                .replace(/\(.*\)/g, '') // Remove (Parentheses content often platform/year)
                .trim();

            // If the title became too short, it might have been just "Netflix"
            if (title.length < 3) return;

            const platformMatch = cleanLine.match(platformRegex);
            const platform = platformMatch ? platformMatch[0] : 'OTT';

            // Title-case the platform (e.g., netflix -> Netflix)
            const formatPlatform = p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();

            items.push({
                title: title,
                date: date,
                originalText: cleanLine,
                platform: formatPlatform(platform)
            });
        }
    });

    return items;
}

/**
 * Regex-based Category Detection
 */
export function detectCategory(text) {
    const t = text.toLowerCase();
    // Order matters — more specific checks first
    if (t.includes('power cut') || t.includes('power shutdown') || t.includes('tangedco') || t.includes('tneb')) return 'alerts';
    if (t.includes('traffic advisory') || t.includes('road closure') || t.includes('water supply')) return 'alerts';
    if (t.includes('cyclone') || t.includes('heavy rain') || t.includes('weather warning') || t.includes('heat wave') || t.includes('imd')) return 'weather_alerts';
    if (t.includes('movie') || t.includes('release') || t.includes('trailer') || t.includes('film') || t.includes('cinema') || t.includes('ott') || t.includes('booking')) return 'movies';
    if (t.includes('cricket') || t.includes('ipl') || t.includes('match') || t.includes('football') || t.includes('kabaddi') || t.includes('tournament')) return 'sports';
    if (t.includes('festival') || t.includes('holiday') || t.includes('jayanti') || t.includes('puja') || t.includes('pongal') || t.includes('diwali') || t.includes('ramadan') || t.includes('eid')) return 'festivals';
    if (t.includes('sale') || t.includes('offer') || t.includes('discount') || t.includes('shopping') || t.includes('deal') || t.includes('expo')) return 'shopping';
    if (t.includes('minister') || t.includes('vip visit') || t.includes('rally') || t.includes('protest') || t.includes('bandh') || t.includes('corporation')) return 'civic';
    // Entertainment merged into events logic
    if (t.includes('concert') || t.includes('exhibition') || t.includes('show') || t.includes('workshop') || t.includes('theatre') || t.includes('opera') || t.includes('sabha') || t.includes('comedy')) return 'events';
    if (t.includes('alert') || t.includes('warning') || t.includes('shut')) return 'alerts';
    return 'general';
}

/**
 * Intelligent Date Extraction
 * Looks for patterns like "Oct 20", "Next Friday", "Tomorrow", etc.
 * @param {string} text - The text to search for dates
 * @param {Date|null} pubDate - The publication date of the article (for year context)
 */
export function extractFutureDate(text, pubDate) {
    // 1. Check for explicit dates e.g., "October 25", "25th Oct", "Oct 25, 2024"
    // Regex for Month Day pairs, optionally with Year
    const months = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december';

    // Pattern: "October 25" or "October 25, 2025"
    const dateRegex = new RegExp(`\\b(${months})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, 'i');

    // Pattern: "25th October" or "25 October 2025"
    const reverseDateRegex = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${months})(?:,?\\s+(\\d{4}))?\\b`, 'i');

    let match = text.match(dateRegex);
    let day, monthStr, explicitYear;

    if (match) {
        monthStr = match[1];
        day = parseInt(match[2]);
        if (match[3]) explicitYear = parseInt(match[3]);
    } else {
        match = text.match(reverseDateRegex);
        if (match) {
            day = parseInt(match[1]);
            monthStr = match[2];
            if (match[3]) explicitYear = parseInt(match[3]);
        }
    }

    if (day && monthStr) {
        // Contextualize the year
        const now = new Date();
        const monthIndex = new Date(`${monthStr} 1, 2000`).getMonth();
        let year;

        if (explicitYear) {
            // Use the explicit year found in the text
            year = explicitYear;
        } else {
            year = now.getFullYear();

            // If pubDate is available, use its year as the primary anchor
            if (pubDate && !isNaN(pubDate.getTime())) {
                year = pubDate.getFullYear();

                // Handle edge case: Article in Dec talking about Jan (Next Year)
                const eventMonthIsEarlier = monthIndex < pubDate.getMonth();
                if (eventMonthIsEarlier && (pubDate.getMonth() - monthIndex) > 6) {
                    year = year + 1;
                }
            } else {
                 // Fallback: if extracted date is "far past" relative to now, assume next year.
                 const currentMonth = now.getMonth();
                 if (monthIndex < currentMonth && (currentMonth - monthIndex) > 3) {
                     year = year + 1;
                 }
            }
        }

        return new Date(year, monthIndex, day);
    }

    // 2. Relative Dates: "Tomorrow", "This Friday"
    const lower = text.toLowerCase();

    // Use pubDate as "today" reference if available, otherwise real Today
    const refDate = (pubDate && !isNaN(pubDate.getTime())) ? pubDate : new Date();

    if (lower.includes('tomorrow')) {
        const d = new Date(refDate);
        d.setDate(refDate.getDate() + 1);
        return d;
    }

    return null;
}


/**
 * Processing Logic to create the final JSON structure
 */
export function processUpAheadData(rawItems, settings) {
    const today = new Date();
    today.setHours(0,0,0,0);

    const timelineMap = new Map(); // Key: "YYYY-MM-DD", Value: { dateObj, items: [] }
    const sections = {
        movies: [],
        festivals: [],
        alerts: [],
        events: [],
        sports: [],
        shopping: [],
        civic: [],
        weather_alerts: []
    };

    const seenIds = new Set();

    // Default max age: 60 hours (2.5 days)
    const maxAgeHours = settings?.hideOlderThanHours || 60;
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

    // Category-specific strict freshness limits (in hours)
    // Weather alerts decay very fast (6h) to avoid "Heavy Rain" warning on a sunny day.
    // General alerts decay fast (12h).
    // Festivals allow a very wide window (2 weeks = 336h) to catch announcements made well in advance.
    const CATEGORY_MAX_AGE_HOURS = {
        weather_alerts: 6,
        alerts: 12,
        festivals: 336
    };

    // Pre-compute merged keyword lists ONCE (not per-item)
    const userKeywords = settings?.upAhead?.keywords || {};
    const mergedNegatives = [...ALL_NEGATIVE_KEYWORDS, ...(userKeywords.negative || [])];
    const mergedPositives = {};
    for (const cat of Object.keys(sections)) {
        const builtIn = CATEGORY_POSITIVE_KEYWORDS[cat] || [];
        const userAdded = userKeywords[cat] || [];
        mergedPositives[cat] = [...builtIn, ...userAdded];
    }
    const userLocations = (settings?.upAhead?.locations || ['Chennai', 'Muscat', 'Trichy']).map(l => l.toLowerCase());

    rawItems.forEach(item => {
        if (seenIds.has(item.id)) return;
        seenIds.add(item.id);

        // Strict Freshness Check
        // If pubDate is missing or invalid, we drop the item to prevent "zombie" news
        if (!item.pubDate || isNaN(item.pubDate.getTime())) {
            return;
        }

        const ageMs = Date.now() - item.pubDate.getTime();

        // Determine effective max age for this item
        let effectiveMaxAgeMs = maxAgeMs;
        if (CATEGORY_MAX_AGE_HOURS[item.category]) {
            // Use the stricter of the two: Global setting vs Category limit
            // e.g. if global is 60h but weather is 6h, use 6h.
            // e.g. if global is 2h (user pref), use 2h.
            const catLimitMs = CATEGORY_MAX_AGE_HOURS[item.category] * 60 * 60 * 1000;
            effectiveMaxAgeMs = Math.min(maxAgeMs, catLimitMs);
        }

        if (ageMs > effectiveMaxAgeMs) {
            return;
        }

        const fullText = (item.title + " " + item.description).toLowerCase();

        // --- FRESHNESS HEURISTICS: Detect "Stale content scraped as new" ---
        // Common in aggregated feeds (e.g. MSN, Yahoo) where "Story by ... 2mo" appears.
        // We drop anything > 2 days old (approx 48h) or clearly marked as months/years old.
        // "2 min read" is fine, but "2 min ago" is also fine. "2mo" or "2 mo" is bad.
        // "2y" or "2 y" is bad.

        // Regex to find age indicators:
        // Matches: "• 2mo", "• 2 mo", "- 5 months ago", "published 3 weeks ago"
        // Avoids: "2 min read", "2 minutes read"
        const staleRegex = /(?:•|-|published)\s*(\d+)\s*(mo|month|months|w|week|weeks|y|year|years)\s*(?:ago)?/i;
        const staleMatch = fullText.match(staleRegex);

        if (staleMatch) {
            const qty = parseInt(staleMatch[1]);
            const unit = staleMatch[2].toLowerCase();

            // If it matches months or years, it's definitely stale
            if (unit.startsWith('mo') || unit.startsWith('y')) {
                return;
            }
            // If it matches weeks, > 1 week is stale for "Up Ahead" (which is usually next 7-14 days)
            // But specifically for alerts, even 1 week is too old.
            if (unit.startsWith('w') && qty >= 1) {
                return;
            }
        }

        // --- SMART KEYWORD FILTERING ---
        // Uses matchesKeyword() for word-boundary safety on single words.
        // Multi-word phrases use includes() (no substring collision risk).

        // LAYER 1: Global Negative Filter
        // Exception: Allow OTT/Movie roundups (e.g. "33 New Releases")
        const isRoundup = /ott|releases|week|weekend/i.test(fullText) && /\d+ new/i.test(fullText);

        if (!isRoundup && mergedNegatives.some(w => matchesKeyword(fullText, w.toLowerCase()))) {
            return; // Drop backward-looking noise
        }

        // LAYER 2: Forward-Looking Signal Score
        // Count how many forward-looking signals this item has
        const forwardScore = FORWARD_LOOKING_SIGNALS.reduce((score, signal) => {
            return fullText.includes(signal) ? score + 1 : score;
        }, 0);

        // LAYER 3: Category-Specific Positive Filter
        const allPositive = mergedPositives[item.category] || [];

        if (allPositive.length > 0) {
            const hasPositiveMatch = allPositive.some(w => matchesKeyword(fullText, w.toLowerCase()));
            // For planner categories, require a positive match OR strong forward-looking signal
            const isPlannerCategory = ['movies', 'events', 'sports', 'shopping'].includes(item.category);
            if (isPlannerCategory && !hasPositiveMatch && forwardScore === 0) {
                return; // Not relevant enough for planning
            }
        }

        // LAYER 4: Strict Location for Alerts & Civic
        if (item.category === 'alerts' || item.category === 'civic') {
            const hasLocation = userLocations.some(loc => fullText.includes(loc));
            if (!hasLocation) {
                return; // Drop alerts not mentioning user's specific locations
            }
        }

        // Attach score for sorting (cleaned before API return)
        item._forwardScore = forwardScore;

        // Populate Sections
        if (item.category && sections[item.category]) {
            // STRICT FILTER: For planner sections, we REQUIRE a valid extracted date.
            // Alerts/Weather Alerts are exempt as they often imply "Immediate/Now".
            // EXCEPTION: Roundup articles (e.g. "33 new releases") are allowed even without a specific date
            // EXCEPTION: Festivals allow +- 2 weeks window (handled below)
            const isPlannerCategory = ['movies', 'festivals', 'events', 'sports', 'shopping', 'civic'].includes(item.category);

            if (isPlannerCategory && !item.extractedDate && !item.isRoundup) {
                return;
            }

            // Special Check for Festivals: Relaxed freshness + Recent Past Window
            // Publication Freshness: Allowed up to 14 days old (via CATEGORY_MAX_AGE_HOURS above).
            // Event Date Window: User requested "-3 days to Future".
            // So if an event happened > 3 days ago, drop it.

            if (item.category === 'festivals' && item.extractedDate) {
                const diffTime = item.extractedDate.getTime() - today.getTime();
                const diffDays = diffTime / (1000 * 3600 * 24);

                // Allow if within -3 days to +infinity (Up Ahead implies future is fine)
                // If it's older than 3 days ago, don't show in "Festivals & Holidays" list
                if (diffDays < -3) {
                    return;
                }
            } else if (isPlannerCategory && item.extractedDate) {
                 // For other planner categories (Movies, Events), strict future check for the "Worth Knowing" lists?
                 // Original logic didn't explicitly filter *out* past items from 'sections',
                 // but 'timeline' logic only added future.
                 // Let's ensure 'sections' lists also look fresh.
                 if (item.extractedDate < today) {
                     // Drop past movies/events from the sidebar lists
                     return;
                 }
            }

            // Simplify item for display
            const displayItem = {
                title: item.title,
                link: item.link,
                releaseDate: item.extractedDate ? item.extractedDate.toDateString() : null,
                date: item.extractedDate ? item.extractedDate.toDateString() : null,
                text: item.title,
                severity: 'medium',
                language: 'Unknown',
                isRoundup: item.isRoundup,
                subItemsCount: item.subItems ? item.subItems.length : 0
            };
            sections[item.category].push(displayItem);
        }

        // Populate Timeline
        let targetDate = item.extractedDate;

        // If no date, but it's an alert/weather_alert or very recent news, put in Today
        if (!targetDate && (item.category === 'alerts' || item.category === 'weather_alerts')) {
             // Only if very fresh (< 24h)
             if (item.pubDate && (Date.now() - item.pubDate.getTime() < 24 * 60 * 60 * 1000)) {
                 targetDate = today;
             }
        }

        // If it's a roundup without a specific date, assume "This Week" (Today)
        if (!targetDate && item.isRoundup) {
            targetDate = today;
        }

        // Only add to timeline if targetDate is >= Today
        if (targetDate && targetDate >= today) {
            const dateKey = targetDate.toISOString().split('T')[0];

            if (!timelineMap.has(dateKey)) {
                timelineMap.set(dateKey, {
                    date: dateKey,
                    dayLabel: getDayLabel(targetDate),
                    items: []
                });
            }

            const timelineItem = {
                id: item.id,
                type: getItemType(item.category), // "movie", "alert", etc.
                title: item.title,
                subtitle: item.isRoundup ? `${item.subItems?.length || 'Multiple'} ITEMS` : item.category.toUpperCase(),
                description: item.description,
                tags: [item.category],
                link: item.link,
                isRoundup: item.isRoundup,
                subItems: item.subItems,
                _forwardScore: item._forwardScore || 0
            };

            timelineMap.get(dateKey).items.push(timelineItem);
        }
    });

    // Sort Timeline by Date, and within each day sort by forward-looking score (most actionable first)
    const sortedTimeline = Array.from(timelineMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    sortedTimeline.forEach(day => {
        day.items.sort((a, b) => (b._forwardScore || 0) - (a._forwardScore || 0));
        // Clean internal scoring field from API response
        day.items.forEach(item => delete item._forwardScore);
    });

    // Limit sections length
    Object.keys(sections).forEach(k => {
        sections[k] = sections[k].slice(0, 5);
    });

    // Generate Mock Weekly Plan if empty (or heuristic based)
    const weekly_plan = generateWeeklyPlan(sortedTimeline);

    return {
        timeline: sortedTimeline,
        sections: sections,
        weekly_plan: weekly_plan,
        lastUpdated: new Date().toISOString()
    };
}

function getDayLabel(date) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const d = new Date(date);
    d.setHours(0,0,0,0);

    if (d.getTime() === today.getTime()) return "Today";
    if (d.getTime() === tomorrow.getTime()) return "Tomorrow";

    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function getItemType(category) {
    // map plural categories to singular types expected by UI
    const map = {
        movies: 'movie',
        events: 'event',
        festivals: 'festival',
        alerts: 'alert',
        sports: 'sport',
        shopping: 'shopping',
        civic: 'civic',
        weather_alerts: 'weather_alert'
    };
    return map[category] || 'event';
}

function generateWeeklyPlan(timeline) {
    const plan = {};
    const today = new Date();

    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });

        const timelineDay = timeline.find(t => t.date === dateStr);

        if (timelineDay && timelineDay.items.length > 0) {
            plan[dayName] = timelineDay.items.map(item => ({
                title: item.title,
                type: item.type,
                icon: getCategoryIcon(item.type),
                link: item.link
            }));
        } else {
            plan[dayName] = []; // Return empty array
        }
    }

    return plan;
}

function getCategoryIcon(type) {
    const icons = {
        movie: '🎬',
        event: '🎭',
        festival: '🎊',
        alert: '⚠️',
        sport: '⚽',
        shopping: '🛒',
        civic: '🏛️',
        entertainment: '🎶',
        weather_alert: '🌪️',
        general: '📅'
    };
    return icons[type] || '📅';
}
