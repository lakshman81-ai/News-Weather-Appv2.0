/**
 * Detect breaking news based on:
 * 1. Multiple sources reporting same story within short timeframe
 * 2. Very recent publication (< 1 hour old)
 * 3. Time-decay scoring formula
 */

function normalizeTitle(title) {
    return title
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ')     // Normalize whitespace
        .trim();
}

export class BreakingNewsDetector {
    constructor() {
        this.newsMap = new Map(); // normalizedTitle → { firstSeen, sources, count }
        this.breaking = new Set();
    }

    /**
     * Register article and check if it's breaking news
     * Returns: { isBreaking, breakingScore, multiplier }
     */
    checkBreakingNews(article, currentTime = Date.now()) {
        if (!article || !article.title || !article.publishedAt) {
            return { isBreaking: false, breakingScore: 0, multiplier: 1.0 };
        }

        const titleNormalized = normalizeTitle(article.title);
        const timeSincePubMinutes = (currentTime - article.publishedAt) / 1000 / 60;

        let isBreaking = false;
        let breakingScore = 0;

        // Check if this article matches an existing breaking story
        for (const [normalizedTitle, newsData] of this.newsMap.entries()) {
            const similarity = this.calculateSimilarity(titleNormalized, normalizedTitle);

            // If title similarity > 70%, consider it same story
            if (similarity > 0.7) {
                const timeSinceFirstMinutes = (currentTime - newsData.firstSeen) / 1000 / 60;

                // Add new source if not yet reported
                if (timeSinceFirstMinutes < 60 && !newsData.sources.has(article.source)) {
                    newsData.sources.add(article.source);
                    newsData.count++;
                }

                // Mark as breaking if:
                // 1. Multiple sources (≥2) reported it
                // 2. Article is < 60 minutes old
                if (newsData.count >= 2 && timeSincePubMinutes < 60) {
                    isBreaking = true;

                    // Time-decay formula: log(N₁ / T)
                    // N₁ = 60 (reference time in minutes)
                    // T = time since publication
                    const N1 = 60;
                    breakingScore = Math.log(N1 / Math.max(1, timeSincePubMinutes)) || 1.0;
                    breakingScore = Math.min(breakingScore, 3.0); // Cap at 3x multiplier

                    this.breaking.add(titleNormalized);
                }
                break;
            }
        }

        // Register new story if not found in map
        if (!this.newsMap.has(titleNormalized)) {
            this.newsMap.set(titleNormalized, {
                firstSeen: article.publishedAt,
                sources: new Set([article.source]),
                count: 1,
                title: article.title
            });
        }

        return {
            isBreaking,
            breakingScore,
            multiplier: isBreaking ? breakingScore : 1.0
        };
    }

    /**
     * Calculate word-overlap similarity between titles
     * Range: 0 (completely different) to 1 (identical)
     */
    calculateSimilarity(title1, title2) {
        const words1 = new Set(title1.split(/\s+/));
        const words2 = new Set(title2.split(/\s+/));

        const intersection = [...words1].filter(w => words2.has(w)).length;
        const union = new Set([...words1, ...words2]).size;

        return intersection / Math.max(union, 1);
    }

    /**
     * Clean up old stories from memory
     * Call periodically to prevent memory leak
     * Default: Remove stories older than 120 minutes (2 hours)
     */
    cleanup(maxAgeMinutes = 120) {
        const now = Date.now();
        const entriesToDelete = [];

        for (const [title, data] of this.newsMap.entries()) {
            const ageMinutes = (now - data.firstSeen) / 1000 / 60;
            if (ageMinutes > maxAgeMinutes) {
                entriesToDelete.push(title);
            }
        }

        entriesToDelete.forEach(title => {
            this.newsMap.delete(title);
            this.breaking.delete(title);
        });

        return entriesToDelete.length; // Return count deleted for logging
    }

    /**
     * Get all currently breaking stories
     */
    getBreakingStories() {
        const breaking = [];
        for (const [title, data] of this.newsMap.entries()) {
            if (data.count >= 2) {
                breaking.push({
                    title: data.title,
                    sourceCount: data.count,
                    sources: [...data.sources],
                    firstSeen: data.firstSeen
                });
            }
        }
        return breaking;
    }
}

// Singleton instance - use throughout app
export const breakingDetector = new BreakingNewsDetector();
