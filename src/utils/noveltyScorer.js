/**
 * Calculates novelty score based on TF-IDF deviation.
 * Uses a session-only in-memory corpus to detect fresh topics.
 */

// In-memory corpus (cleared on reload/session start)
// Map: token -> { count: number, lastSeen: timestamp }
const CORPUS_CACHE = new Map();

// Helper: Simple tokenization
function tokenize(text) {
    return text.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove punctuation
        .split(/\s+/)
        .filter(w => w.length > 3); // Ignore short words
}

export function calculateNoveltyScore(title, description, section) {
    const text = `${title} ${description}`;
    const tokens = tokenize(text);

    if (tokens.length === 0) return 1.0;

    let rareTokenCount = 0;

    // Analyze tokens
    tokens.forEach(token => {
        const stats = CORPUS_CACHE.get(token) || { count: 0, lastSeen: 0 };

        // If token seen less than 2 times, it's considered "rare" / novel in this session
        if (stats.count < 2) {
            rareTokenCount++;
        }

        // Update corpus
        CORPUS_CACHE.set(token, {
            count: stats.count + 1,
            lastSeen: Date.now()
        });
    });

    // Calculate novelty ratio
    const noveltyRatio = rareTokenCount / tokens.length;

    // Boost score: 1.0 to 1.5 based on how many words are new
    // If 50% of words are new, boost by 1.25x
    // Cap at 1.5x
    const boost = 1.0 + Math.min(noveltyRatio * 0.5, 0.5);

    return boost;
}

/**
 * Debug utility to see corpus size
 */
export function getCorpusSize() {
    return CORPUS_CACHE.size;
}
