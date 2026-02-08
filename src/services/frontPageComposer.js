/**
 * Composes a balanced front page with diversity constraints
 */

export function composeBalancedFeed(articles, limit = 20, maxTopicPercent = 40, maxGeoPercent = 30) {
    const selected = [];
    const topicCounts = new Map();
    const geoCounts = new Map();

    // Sort by impact score (highest first)
    // We assume impactScore is present, otherwise we default to 0.
    // If scores are equal or missing, the original order is preserved roughly by the sort stability or nature of data.
    const sorted = [...articles].sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0));

    for (const article of sorted) {
        if (selected.length >= limit) break;

        // Extract topic and geography
        const topic = article.section || 'general';
        const geo = extractGeography(article.title, article.description);

        const topicCount = topicCounts.get(topic) || 0;
        const geoCount = geoCounts.get(geo) || 0;

        // Diversity constraints
        const maxPerTopic = Math.floor(limit * (maxTopicPercent / 100));
        const maxPerGeo = Math.floor(limit * (maxGeoPercent / 100));

        // Skip if exceeds constraints
        // Note: We check strictly '>=', so if max is 8, and we have 8, we skip the 9th.
        if (topicCount >= maxPerTopic) {
            // console.log(`[Composer] Skipping "${article.title}" - topic limit reached`);
            continue;
        }

        if (geoCount >= maxPerGeo) {
            // console.log(`[Composer] Skipping "${article.title}" - geo limit reached`);
            continue;
        }

        // Add to selection
        selected.push(article);
        topicCounts.set(topic, topicCount + 1);
        geoCounts.set(geo, geoCount + 1);
    }

    console.log('[Composer] Final composition:', {
        total: selected.length,
        byTopic: Object.fromEntries(topicCounts),
        byGeo: Object.fromEntries(geoCounts)
    });

    return selected;
}

/**
 * Extract primary geography from article
 */
export function extractGeography(title, description) {
    const text = `${title || ''} ${description || ''}`.toLowerCase();

    // Priority order: local > regional > national > global
    if (/chennai|madras/i.test(text)) return 'chennai';
    if (/trichy|tiruchirappalli/i.test(text)) return 'trichy';
    if (/tamil nadu|tn /i.test(text)) return 'tamil-nadu';
    if (/india|delhi|mumbai|bangalore/i.test(text)) return 'india';

    return 'global';
}
