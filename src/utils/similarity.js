import stringSimilarity from 'string-similarity';

/**
 * Cluster similar articles by title similarity
 * Returns array of clusters, where each cluster contains similar articles
 */
export const clusterSimilarArticles = (articles, similarityThreshold = 0.75) => {
    if (!articles || articles.length === 0) return [];

    const clusters = [];
    const used = new Set();

    // For each unused article, start a new cluster
    for (let i = 0; i < articles.length; i++) {
        if (used.has(i)) continue;

        const cluster = [articles[i]];
        used.add(i);

        // Find similar articles and add to cluster
        for (let j = i + 1; j < articles.length; j++) {
            if (used.has(j)) continue;

            const similarity = stringSimilarity.compareTwoStrings(
                articles[i].title.toLowerCase(),
                articles[j].title.toLowerCase()
            );

            if (similarity > similarityThreshold) {
                cluster.push(articles[j]);
                used.add(j);
            }
        }

        clusters.push(cluster);
    }

    return clusters;
};

/**
 * Merge a cluster of articles into a single representative item
 * Keeps highest-scored article, aggregates source info
 */
export const mergeCluster = (cluster) => {
    if (!cluster || cluster.length === 0) return null;

    // Find highest-scored article
    const sorted = [...cluster].sort((a, b) => b.impactScore - a.impactScore);
    const representative = sorted[0];

    // Collect unique sources
    const sources = [...new Set(cluster.map(a => a.source))];
    const sourceCount = sources.length;

    // Apply consensus boost: multiple sources = higher relevance
    const consensusBoost = 1 + ((sourceCount - 1) * 0.1); // 1.0 for 1 source, 1.1 for 2, 1.2 for 3, etc.

    // Force consensus data if missing
    // (Logging removed for production)

    return {
        ...representative,
        sourceCount,
        allSources: sources,
        clusteredItems: cluster.length,
        impactScore: representative.impactScore * consensusBoost,
        clusterRepresentative: true // Flag for UI
    };
};

/**
 * Deduplicate articles by computing exact matches first,
 * then clustering similar ones
 */
export const deduplicateAndCluster = (articles, similarityThreshold = 0.75) => {
    // Step 1: Exact ID deduplication (existing logic)
    const seen = new Set();
    const exactDeduped = [];

    for (const article of articles) {
        if (!article.id || seen.has(article.id)) continue;
        seen.add(article.id);
        exactDeduped.push(article);
    }

    // Step 2: Similarity-based clustering
    const clusters = clusterSimilarArticles(exactDeduped, similarityThreshold);

    // Step 3: Merge each cluster into representative
    const merged = clusters
        .map(mergeCluster)
        .filter(item => item !== null);

    return merged;
};
