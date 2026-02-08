/**
 * AGENT-SAFE DATA LAYER
 * 
 * Core Principles (Agent Law #0):
 * - Data moves through states: FETCHED → NORMALIZED → VERIFIED → SEALED → EXPIRED
 * - UI only sees SEALED snapshots
 * - Refresh is a transaction, not a button
 * - Never mutate sealed snapshots
 */

// ============================================
// DATA STATES (FSM)
// ============================================

export const DataState = {
    FETCHED: 'FETCHED',       // Raw API response
    NORMALIZED: 'NORMALIZED', // Cleaned and structured
    VERIFIED: 'VERIFIED',     // Constraints checked
    SEALED: 'SEALED',         // Immutable, UI-ready
    EXPIRED: 'EXPIRED'        // Past TTL, visible with label
};

// ============================================
// REFRESH CONTRACT
// ============================================

/**
 * Every refresh must declare an explicit contract
 * @typedef {Object} RefreshContract
 * @property {'manual' | 'scheduled' | 'emergency' | 'auto'} intent
 * @property {string[]} sections
 * @property {{from: string, to: string}} dataWindow
 * @property {'snapshot' | 'live'} isolationLevel
 * @property {'fail-closed' | 'best-effort'} strictness
 */

export function createRefreshContract(options = {}) {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    return {
        intent: options.intent || 'manual',
        sections: options.sections || [],
        dataWindow: {
            from: options.from || oneHourAgo.toISOString(),
            to: options.to || now.toISOString()
        },
        isolationLevel: options.isolationLevel || 'snapshot',
        strictness: options.strictness || 'fail-closed',
        timestamp: now.toISOString()
    };
}

// ============================================
// SNAPSHOT MANAGEMENT
// ============================================

/**
 * Create a sealed snapshot
 * @typedef {Object} Snapshot
 * @property {string} snapshotId
 * @property {string} createdAt
 * @property {RefreshContract} contract
 * @property {Object} items
 * @property {string} checksum
 * @property {Object} metadata
 */

export function createSnapshot(contract, items, metadata = {}) {
    const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();

    // Calculate checksum for integrity verification
    const checksum = simpleHash(JSON.stringify(items));

    return {
        snapshotId,
        createdAt,
        contract,
        items,
        checksum,
        state: DataState.SEALED,
        metadata: {
            sourcesOk: metadata.sourcesOk || 0,
            sourcesDelayed: metadata.sourcesDelayed || 0,
            stability: metadata.stability || 'STABLE',
            degradations: metadata.degradations || [],
            ...metadata
        }
    };
}

/**
 * Simple hash function for checksum
 */
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
// GROUND TRUTH ITEM
// ============================================

/**
 * @typedef {Object} GroundTruthItem
 * @property {string} id
 * @property {string} type - 'news' | 'weather' | 'market'
 * @property {Object} data
 * @property {Object} provenance
 * @property {Object} confidence
 * @property {string} state
 * @property {string} sealedAt
 */

export function createGroundTruthItem(type, data, provenance) {
    return {
        id: `gti_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        provenance: {
            source: provenance.source,
            fetchedAt: new Date().toISOString(),
            url: provenance.url || null,
            rawResponse: provenance.rawResponse || null
        },
        confidence: {
            corroboration: provenance.corroboration || 1,
            freshness: calculateFreshness(provenance.publishedAt),
            sourceTier: getSourceTier(provenance.source),
            contradictionCount: 0
        },
        state: DataState.FETCHED,
        sealedAt: null
    };
}

function calculateFreshness(publishedAt) {
    if (!publishedAt) return 48; // Max age
    const hours = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60);
    return Math.min(Math.round(hours), 48);
}

function getSourceTier(source) {
    const tiers = {
        'BBC': 1, 'Reuters': 1, 'NDTV': 2, 'The Hindu': 2,
        'TOI': 2, 'Financial Express': 2, 'DT Next': 3,
        'Oman Observer': 2, 'AccuWeather': 1, 'ECMWF': 1, 'IMD': 1
    };
    return tiers[source] || 3;
}

// ============================================
// WEATHER ENSEMBLE (Not Averages)
// ============================================

/**
 * @typedef {Object} WeatherOpinion
 * @property {'ECMWF' | 'IMD' | 'AccuWeather'} model
 * @property {number} confidence
 * @property {Object} metrics
 */

export function createWeatherOpinion(model, metrics, confidence = 1.0) {
    return {
        model,
        confidence,
        metrics: {
            temp: metrics.temp,
            feelsLike: metrics.feelsLike,
            rainMm: metrics.rainMm,
            rainProb: metrics.rainProb,
            windKph: metrics.windKph || 0,
            condition: metrics.condition
        },
        fetchedAt: new Date().toISOString()
    };
}

/**
 * Aggregate weather opinions AFTER sealing
 * Never collapse before seal
 */
export function aggregateWeatherOpinions(opinions) {
    if (!opinions || opinions.length === 0) return null;

    // Keep raw opinions
    const raw = [...opinions];

    // Calculate aggregates
    const temps = opinions.map(o => o.metrics.temp).filter(Boolean);
    const rainProbs = opinions.map(o => o.metrics.rainProb).filter(Boolean);
    const rainMms = opinions.map(o => o.metrics.rainMm).filter(Boolean);

    const aggregate = {
        temp: temps.length ? Math.round(temps.reduce((a, b) => a + b, 0) / temps.length) : null,
        rainProb: {
            avg: rainProbs.length ? Math.round(rainProbs.reduce((a, b) => a + b, 0) / rainProbs.length) : 0,
            min: rainProbs.length ? Math.min(...rainProbs) : 0,
            max: rainProbs.length ? Math.max(...rainProbs) : 0,
            variance: rainProbs.length > 1 ? Math.max(...rainProbs) - Math.min(...rainProbs) : 0
        },
        rainMm: {
            min: rainMms.length ? Math.min(...rainMms) : 0,
            max: rainMms.length ? Math.max(...rainMms) : 0
        }
    };

    // Flag high variance
    const highVariance = aggregate.rainProb.variance > 25;

    return {
        opinions: raw,
        aggregate,
        warnings: highVariance ? ['⚠️ Models disagree – wide variance'] : []
    };
}

// ============================================
// NEWS CLAIMS (Not Articles)
// ============================================

/**
 * Normalize article into claims for stability across refreshes
 */
export function extractClaims(article) {
    // Simplified claim extraction
    // In production, this would use NLP
    return {
        claimId: `claim_${simpleHash(article.headline)}`,
        subject: article.subject || 'Unknown',
        predicate: 'reports',
        object: article.headline,
        source: article.source,
        publishedAt: article.publishedAt,
        originalArticle: article.id
    };
}

// ============================================
// DRIFT DETECTION
// ============================================

/**
 * Detect significant changes between snapshots
 */
export function detectDrift(previousSnapshot, currentSnapshot, threshold = 0.3) {
    if (!previousSnapshot || !currentSnapshot) return { hasDrift: false };

    const prevItems = previousSnapshot.items || {};
    const currItems = currentSnapshot.items || {};

    // Count changes
    let changes = 0;
    let total = 0;

    for (const section of ['world', 'india', 'chennai', 'trichy', 'local']) {
        const prev = prevItems[section] || [];
        const curr = currItems[section] || [];
        total += Math.max(prev.length, curr.length);

        // Count items that changed
        const prevIds = new Set(prev.map(i => i.id));
        const currIds = new Set(curr.map(i => i.id));

        for (const id of currIds) {
            if (!prevIds.has(id)) changes++;
        }
    }

    const driftRatio = total > 0 ? changes / total : 0;

    return {
        hasDrift: driftRatio > threshold,
        driftRatio,
        changes,
        total,
        recommendation: driftRatio > threshold ? 'FREEZE_AUTO_REFRESH' : 'NORMAL'
    };
}

// ============================================
// SNAPSHOT STORAGE
// ============================================

const SNAPSHOT_KEY = 'dailyEventAI_snapshots';
const MAX_SNAPSHOTS = 10;

export function saveSnapshot(snapshot) {
    try {
        const stored = localStorage.getItem(SNAPSHOT_KEY);
        const snapshots = stored ? JSON.parse(stored) : [];

        // Add new snapshot at the beginning
        snapshots.unshift(snapshot);

        // Keep only last N snapshots
        const trimmed = snapshots.slice(0, MAX_SNAPSHOTS);

        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(trimmed));
        return true;
    } catch (error) { void error;
        console.error('Error saving snapshot:', error);
        return false;
    }
}

export function getLatestSnapshot() {
    try {
        const stored = localStorage.getItem(SNAPSHOT_KEY);
        if (!stored) return null;

        const snapshots = JSON.parse(stored);
        return snapshots[0] || null;
    } catch (error) { void error;
        console.error('Error getting snapshot:', error);
        return null;
    }
}

export function getSnapshotById(snapshotId) {
    try {
        const stored = localStorage.getItem(SNAPSHOT_KEY);
        if (!stored) return null;

        const snapshots = JSON.parse(stored);
        return snapshots.find(s => s.snapshotId === snapshotId) || null;
    } catch (error) { void error;
        return null;
    }
}

export function getAllSnapshots() {
    try {
        const stored = localStorage.getItem(SNAPSHOT_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) { void error;
        return [];
    }
}

// ============================================
// EXPIRATION CHECK
// ============================================

const TTL_MINUTES = {
    weather: 60,    // 1 hour
    news: 30,       // 30 minutes
    market: 5,      // 5 minutes during trading
    social: 15      // 15 minutes
};

export function checkExpiration(snapshot, section = null) {
    if (!snapshot) return { expired: true, reason: 'NO_SNAPSHOT' };

    const createdAt = new Date(snapshot.createdAt);
    const now = new Date();
    const ageMinutes = (now - createdAt) / (1000 * 60);

    const ttl = section ? TTL_MINUTES[section] || 30 : 30;

    return {
        expired: ageMinutes > ttl,
        ageMinutes: Math.round(ageMinutes),
        ttl,
        reason: ageMinutes > ttl ? 'TTL_EXCEEDED' : null
    };
}
