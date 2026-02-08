/**
 * CRAWLER MODE SERVICE
 * 
 * Modes:
 * - AUTO (default): Uses segment timing logic to determine what to fetch
 * - MANUAL: User explicitly triggers refresh
 * - SCHEDULED: Background refresh on intervals
 * - EMERGENCY: Bypass rate limits for urgent updates
 * 
 * API Key Discipline:
 * - Keys are capabilities with risk budgets
 * - Gemini: post-processor only, never fetcher
 * - DuckDuckGo: untrusted input, requires corroboration
 */

// ============================================
// CRAWLER MODES
// ============================================

export const CrawlerMode = {
    AUTO: 'auto',
    MANUAL: 'manual',
    SCHEDULED: 'scheduled',
    EMERGENCY: 'emergency'
};

// ============================================
// API KEY ROLES
// ============================================

export const ApiKeyRole = {
    SEARCH_RETRIEVAL: 'search_retrieval',
    AI_REASONING: 'ai_reasoning',
    FALLBACK_ONLY: 'fallback_only',
    DIAGNOSTICS: 'diagnostics'
};

const API_CONFIG = {
    google: {
        role: ApiKeyRole.SEARCH_RETRIEVAL,
        budget: { dailyQueries: 100 },
        canFetch: true,
        canReason: false
    },
    duckDuckGo: {
        role: ApiKeyRole.SEARCH_RETRIEVAL,
        budget: { dailyQueries: 500 },
        canFetch: true,
        canReason: false,
        requiresCorroboration: true  // Can never produce HIGH confidence alone
    },
    gemini: {
        role: ApiKeyRole.AI_REASONING,
        budget: { dailyTokens: 100000 },
        canFetch: false,  // CRITICAL: Gemini never fetches
        canReason: true,
        requiresSealedSnapshot: true  // Only reads sealed snapshots
    }
};

// ============================================
// RATE LIMITING (Leaky Bucket)
// ============================================

const rateLimits = {
    duckDuckGo: { maxPerMinute: 10, burst: 3 },
    google: { maxPerMinute: 5, burst: 2 },
    gemini: { maxPerMinute: 20, burst: 5 }
};

const buckets = {};

function _checkRateLimit(api) {
    const now = Date.now();
    const limit = rateLimits[api];

    if (!limit) return { allowed: true };

    if (!buckets[api]) {
        buckets[api] = { tokens: limit.burst, lastRefill: now };
    }

    const bucket = buckets[api];
    const elapsed = (now - bucket.lastRefill) / 1000;
    const refill = elapsed * (limit.maxPerMinute / 60);

    bucket.tokens = Math.min(limit.burst, bucket.tokens + refill);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return { allowed: true, remaining: bucket.tokens };
    }

    return { allowed: false, retryAfter: Math.ceil((1 - bucket.tokens) / (limit.maxPerMinute / 60)) };
}

// ============================================
// USAGE TRACKING
// ============================================

const USAGE_KEY = 'dailyEventAI_apiUsage';

export function getUsage() {
    try {
        const stored = localStorage.getItem(USAGE_KEY);
        if (!stored) return initUsage();

        const usage = JSON.parse(stored);

        // Reset if new day
        const today = new Date().toDateString();
        if (usage.date !== today) {
            return initUsage();
        }

        return usage;
    } catch {
        return initUsage();
    }
}

function initUsage() {
    const usage = {
        date: new Date().toDateString(),
        gemini: { tokens: 0, calls: 0 },
        duckDuckGo: { queries: 0 },
        google: { queries: 0 }
    };
    localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
    return usage;
}

export function trackUsage(api, amount = 1, type = 'queries') {
    const usage = getUsage();

    if (!usage[api]) usage[api] = {};
    usage[api][type] = (usage[api][type] || 0) + amount;

    localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
    return usage;
}

export function checkBudget(api) {
    const usage = getUsage();
    const config = API_CONFIG[api];

    if (!config || !config.budget) return { withinBudget: true };

    const apiUsage = usage[api] || {};

    for (const [key, limit] of Object.entries(config.budget)) {
        const usageKey = key.replace('daily', '').toLowerCase();
        if ((apiUsage[usageKey] || 0) >= limit) {
            return {
                withinBudget: false,
                reason: `${api} daily ${usageKey} limit exceeded`,
                limit,
                current: apiUsage[usageKey]
            };
        }
    }

    return { withinBudget: true };
}

// ============================================
// GEMINI CONSTRAINTS
// ============================================

/**
 * Gemini request must follow strict constraints
 */
export function createGeminiRequest(snapshotId, purpose, inputData) {
    const validPurposes = ['summarize', 'label', 'classify'];

    if (!validPurposes.includes(purpose)) {
        throw new Error(`Invalid Gemini purpose: ${purpose}`);
    }

    return {
        snapshotId,
        purpose,
        inputData,
        constraints: {
            no_new_facts: true,
            extractive_only: true,
            no_reordering: true,
            max_tokens: 500
        },
        systemPrompt: `You MUST NOT add, infer, or omit facts.
Use only provided text.
If uncertain, return "UNCERTAIN".
Do not use phrases like "likely", "may indicate", or "experts say".`
    };
}

/**
 * Validate Gemini response for hallucination signals
 */
export function validateGeminiResponse(response) {
    const forbiddenPhrases = [
        'likely', 'may indicate', 'experts say', 'possibly',
        'could be', 'might', 'it appears', 'suggests that'
    ];

    const lower = response.toLowerCase();
    const violations = forbiddenPhrases.filter(p => lower.includes(p));

    if (violations.length > 0) {
        return {
            valid: false,
            reason: 'INFERENCE_DETECTED',
            violations
        };
    }

    return { valid: true };
}

// ============================================
// DUCKDUCKGO QUERY
// ============================================

/**
 * DuckDuckGo query with constraints
 */
export function createDDGQuery(query, region, options = {}) {
    const queryHash = simpleHash(`${query}|${region}|${options.recencyHours || 24}`);

    return {
        query,
        region,
        recencyHours: options.recencyHours || 24,
        maxResults: options.maxResults || 10,
        purpose: 'headline_discovery',
        queryHash,
        constraints: {
            urlsOnly: true,       // Never trust snippets
            requireCorroboration: true  // Must verify with another source
        }
    };
}

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

// ============================================
// QUERY DEDUPLICATION
// ============================================

const QUERY_CACHE_KEY = 'dailyEventAI_queryCache';
const QUERY_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export function checkQueryCache(queryHash) {
    try {
        const stored = localStorage.getItem(QUERY_CACHE_KEY);
        if (!stored) return null;

        const cache = JSON.parse(stored);
        const entry = cache[queryHash];

        if (!entry) return null;

        const age = Date.now() - entry.timestamp;
        if (age > QUERY_CACHE_TTL) {
            delete cache[queryHash];
            localStorage.setItem(QUERY_CACHE_KEY, JSON.stringify(cache));
            return null;
        }

        return entry.result;
    } catch {
        return null;
    }
}

export function cacheQuery(queryHash, result) {
    try {
        const stored = localStorage.getItem(QUERY_CACHE_KEY);
        const cache = stored ? JSON.parse(stored) : {};

        cache[queryHash] = {
            result,
            timestamp: Date.now()
        };

        localStorage.setItem(QUERY_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
        console.error('Error caching query:', error);
    }
}

// ============================================
// API AUDIT LOG
// ============================================

const AUDIT_KEY = 'dailyEventAI_auditLog';
const MAX_AUDIT_ENTRIES = 100;

export function logApiCall(api, purpose, snapshotId, details = {}) {
    try {
        const stored = localStorage.getItem(AUDIT_KEY);
        const log = stored ? JSON.parse(stored) : [];

        log.unshift({
            timestamp: new Date().toISOString(),
            api,
            purpose,
            snapshotId,
            success: details.success !== false,
            tokensUsed: details.tokensUsed || 0,
            error: details.error || null
        });

        // Keep only last N entries
        const trimmed = log.slice(0, MAX_AUDIT_ENTRIES);
        localStorage.setItem(AUDIT_KEY, JSON.stringify(trimmed));
    } catch (error) {
        console.error('Error logging API call:', error);
    }
}

export function getAuditLog() {
    try {
        const stored = localStorage.getItem(AUDIT_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

// ============================================
// CRAWLER MODE LOGIC (AUTO)
// ============================================

import { getCurrentSegment, getRecommendedToggles } from '../utils/timeSegment';

/**
 * Determine what to crawl based on current segment (AUTO mode)
 */
export function getAutoCrawlConfig() {
    const segment = getCurrentSegment();
    const recommended = getRecommendedToggles(segment);

    // Map segment to crawler priorities
    const priorities = {
        morning_weather: {
            weather: 'high',
            news: 'medium',
            market: 'low'
        },
        morning_news: {
            weather: 'high',
            news: 'high',
            market: 'low'
        },
        market_brief: {
            weather: 'low',
            news: 'medium',
            market: 'high'
        },
        midday_brief: {
            weather: 'medium',
            news: 'high',
            market: 'medium'
        },
        market_movers: {
            weather: 'low',
            news: 'medium',
            market: 'high'
        },
        evening_news: {
            weather: 'medium',
            news: 'high',
            market: 'medium'
        },
        local_events: {
            weather: 'medium',
            news: 'high',
            market: 'low'
        },
        night_wrap_up: {
            weather: 'low',
            news: 'medium',
            market: 'medium'
        },
        urgent_only: {
            weather: 'emergency_only',
            news: 'emergency_only',
            market: 'disabled'
        }
    };

    return {
        segment,
        recommended,
        priorities: priorities[segment.id] || priorities.morning_news,
        refreshIntervals: {
            weather: 60,  // minutes
            news: 30,
            market: 5
        }
    };
}

// ============================================
// KEY HEALTH MONITORING
// ============================================

const HEALTH_KEY = 'dailyEventAI_keyHealth';

export function updateKeyHealth(api, success, latency) {
    try {
        const stored = localStorage.getItem(HEALTH_KEY);
        const health = stored ? JSON.parse(stored) : {};

        if (!health[api]) {
            health[api] = { success: 0, failure: 0, totalLatency: 0, calls: 0 };
        }

        if (success) {
            health[api].success++;
        } else {
            health[api].failure++;
        }
        health[api].totalLatency += latency;
        health[api].calls++;

        localStorage.setItem(HEALTH_KEY, JSON.stringify(health));

        // Return current health status
        const h = health[api];
        return {
            successRate: h.calls > 0 ? h.success / h.calls : 1,
            errorRate: h.calls > 0 ? h.failure / h.calls : 0,
            avgLatency: h.calls > 0 ? h.totalLatency / h.calls : 0
        };
    } catch {
        return { successRate: 1, errorRate: 0, avgLatency: 0 };
    }
}

export function getKeyHealth(api) {
    try {
        const stored = localStorage.getItem(HEALTH_KEY);
        if (!stored) return { successRate: 1, errorRate: 0, avgLatency: 0 };

        const health = JSON.parse(stored);
        const h = health[api];

        if (!h) return { successRate: 1, errorRate: 0, avgLatency: 0 };

        return {
            successRate: h.calls > 0 ? h.success / h.calls : 1,
            errorRate: h.calls > 0 ? h.failure / h.calls : 0,
            avgLatency: h.calls > 0 ? h.totalLatency / h.calls : 0
        };
    } catch {
        return { successRate: 1, errorRate: 0, avgLatency: 0 };
    }
}

// ============================================
// FAILURE HANDLING
// ============================================

export const FailureResponse = {
    API_TIMEOUT: 'seal_with_partial',
    CONFLICTING_DATA: 'surface_disagreement',
    HIGH_CHURN: 'freeze_auto_refresh',
    MISSING_SOURCE: 'mark_unavailable',
    RATE_LIMITED: 'reuse_snapshot',
    HALLUCINATION_DETECTED: 'disable_gemini_session'
};

export function handleFailure(type, context = {}) {
    const response = FailureResponse[type] || 'best_effort';

    logApiCall(context.api || 'system', 'failure_handling', context.snapshotId, {
        success: false,
        error: type
    });

    return {
        action: response,
        message: getFailureMessage(type),
        shouldContinue: !['HALLUCINATION_DETECTED', 'HIGH_CHURN'].includes(type)
    };
}

function getFailureMessage(type) {
    const messages = {
        API_TIMEOUT: 'Some data may be delayed',
        CONFLICTING_DATA: 'Sources report different information',
        HIGH_CHURN: 'Data unstable, auto-refresh paused',
        MISSING_SOURCE: 'Source temporarily unavailable',
        RATE_LIMITED: 'Using cached data',
        HALLUCINATION_DETECTED: 'AI response discarded',
        API_KEY_MISSING: 'API key missing',
        API_KEY_INVALID: 'API key invalid',
        SOURCE_UNAVAILABLE: 'Source unavailable'
    };
    return messages[type] || 'An issue occurred';
}

// ============================================
// API KEY VALIDATION
// ============================================

export const ApiKeyError = {
    MISSING: 'API_KEY_MISSING',
    INVALID: 'API_KEY_INVALID',
    EXPIRED: 'API_KEY_EXPIRED',
    RATE_LIMITED: 'RATE_LIMITED'
};

/**
 * Check if required API keys are configured
 * @param {Object} settings - App settings
 * @param {string[]} requiredApis - List of APIs needed for the operation
 * @returns {Object} Validation result with errors if any
 */
export function validateApiKeys(settings, requiredApis = []) {
    const errors = [];

    for (const api of requiredApis) {
        let keyField;
        switch (api) {
            case 'google':
                keyField = 'googleApiKey';
                break;
            case 'duckDuckGo':
                keyField = 'duckDuckGoApiKey';
                break;
            case 'gemini':
                keyField = 'geminiApiKey';
                break;
            default:
                continue;
        }

        const key = settings[keyField];
        if (!key || key.trim() === '') {
            errors.push({
                api,
                error: ApiKeyError.MISSING,
                message: `${api} API key missing`
            });
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Get status message for API configuration
 * @param {Object} settings - App settings
 */
export function getApiStatus(settings) {
    const status = {
        google: { configured: false, status: 'Not configured' },
        duckDuckGo: { configured: false, status: 'Not configured' },
        gemini: { configured: false, status: 'Not configured' }
    };

    if (settings.googleApiKey && settings.googleApiKey.trim()) {
        status.google = { configured: true, status: 'Configured' };
    }
    if (settings.duckDuckGoApiKey && settings.duckDuckGoApiKey.trim()) {
        status.duckDuckGo = { configured: true, status: 'Configured' };
    }
    if (settings.geminiApiKey && settings.geminiApiKey.trim()) {
        status.gemini = { configured: true, status: 'Configured' };
    }

    // Check health for configured APIs
    for (const api of Object.keys(status)) {
        if (status[api].configured) {
            const health = getKeyHealth(api);
            if (health.errorRate > 0.1) {
                status[api].status = 'Degraded';
            } else if (health.errorRate > 0.5) {
                status[api].status = 'Failing';
            }
        }
    }

    return status;
}

/**
 * Check if we can proceed with fetch based on API key availability
 * Shows appropriate error messages if keys are missing
 */
export function canFetchWithApis(settings, requiredApis) {
    const validation = validateApiKeys(settings, requiredApis);

    if (!validation.valid) {
        return {
            canFetch: false,
            errors: validation.errors,
            message: validation.errors.map(e => e.message).join(', ')
        };
    }

    // Check rate limits
    for (const api of requiredApis) {
        const budget = checkBudget(api);
        if (!budget.withinBudget) {
            return {
                canFetch: false,
                errors: [{ api, error: 'BUDGET_EXCEEDED', message: budget.reason }],
                message: budget.reason
            };
        }
    }

    return { canFetch: true, errors: [], message: null };
}
