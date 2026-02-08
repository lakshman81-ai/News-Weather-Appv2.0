/**
 * Multi-factor source authority metrics
 * Updated based on: credibility, staff size, bureaus, article quality
 */

export const SOURCE_METRICS = {
    // International Tier-1
    bbc: {
        name: 'BBC',
        credibility: 2.0,
        staffSize: 5500,
        bureaus: 50,
        avgArticleLength: 800,
        updateFrequency: 'continuous',
        weight: 1.8,
        categories: ['world', 'business', 'technology', 'entertainment']
    },
    reuters: {
        name: 'Reuters',
        credibility: 1.95,
        staffSize: 2500,
        bureaus: 200,
        avgArticleLength: 600,
        updateFrequency: 'continuous',
        weight: 1.8,
        categories: ['world', 'business']
    },
    apnews: {
        name: 'AP News',
        credibility: 1.9,
        staffSize: 2500,
        bureaus: 250,
        avgArticleLength: 500,
        updateFrequency: 'continuous',
        weight: 1.75,
        categories: ['world', 'business', 'sports']
    },
    aljazeera: {
        name: 'Al Jazeera',
        credibility: 1.7,
        staffSize: 2000,
        bureaus: 60,
        avgArticleLength: 900,
        updateFrequency: 'hourly',
        weight: 1.6,
        categories: ['world', 'business']
    },
    cnn: {
        name: 'CNN',
        credibility: 1.6,
        staffSize: 3000,
        bureaus: 40,
        avgArticleLength: 400,
        updateFrequency: 'continuous',
        weight: 1.5,
        categories: ['world', 'business', 'technology']
    },

    // Indian National
    ndtv: {
        name: 'NDTV',
        credibility: 1.75,
        staffSize: 1200,
        bureaus: 15,
        avgArticleLength: 600,
        updateFrequency: 'continuous',
        weight: 1.6,
        categories: ['india', 'business', 'technology']
    },
    thehindu: {
        name: 'The Hindu',
        credibility: 1.8,
        staffSize: 800,
        bureaus: 12,
        avgArticleLength: 800,
        updateFrequency: 'hourly',
        weight: 1.65,
        categories: ['india', 'world', 'business', 'technology']
    },
    toi: {
        name: 'Times of India',
        credibility: 1.6,
        staffSize: 1500,
        bureaus: 25,
        avgArticleLength: 500,
        updateFrequency: 'continuous',
        weight: 1.5,
        categories: ['india', 'entertainment', 'sports']
    },
    financialexpress: {
        name: 'Financial Express',
        credibility: 1.65,
        staffSize: 300,
        bureaus: 5,
        avgArticleLength: 700,
        updateFrequency: 'hourly',
        weight: 1.55,
        categories: ['business', 'technology']
    },
    indianexpress: {
        name: 'Indian Express',
        credibility: 1.7,
        staffSize: 400,
        bureaus: 8,
        avgArticleLength: 750,
        updateFrequency: 'hourly',
        weight: 1.6,
        categories: ['india', 'world', 'business']
    },

    // Tech/Specialized
    techcrunch: {
        name: 'TechCrunch',
        credibility: 1.7,
        staffSize: 200,
        bureaus: 3,
        avgArticleLength: 600,
        updateFrequency: 'hourly',
        weight: 1.6,
        categories: ['technology'],
        specialization: 'startups, VC'
    },
    theverge: {
        name: 'The Verge',
        credibility: 1.65,
        staffSize: 100,
        bureaus: 1,
        avgArticleLength: 900,
        updateFrequency: 'hourly',
        weight: 1.55,
        categories: ['technology'],
        specialization: 'gadgets, consumer tech'
    },

    // Sports
    espn: {
        name: 'ESPN',
        credibility: 1.7,
        staffSize: 500,
        bureaus: 10,
        avgArticleLength: 500,
        updateFrequency: 'continuous',
        weight: 1.6,
        categories: ['sports']
    },

    // Entertainment
    bollywoodhungama: {
        name: 'Bollywood Hungama',
        credibility: 1.4,
        staffSize: 100,
        bureaus: 2,
        avgArticleLength: 400,
        updateFrequency: 'hourly',
        weight: 1.3,
        categories: ['entertainment'],
        specialization: 'Indian cinema'
    },

    // Aggregators
    googlenews: {
        name: 'Google News',
        credibility: 1.5, // Aggregator trust
        staffSize: 0,
        bureaus: 0,
        avgArticleLength: 0,
        updateFrequency: 'continuous',
        weight: 1.0,
        categories: ['world', 'india', 'business', 'technology', 'entertainment', 'sports']
    },

    // Default for unmapped sources
    default: {
        name: 'Default Source',
        credibility: 1.0,
        staffSize: 50,
        bureaus: 1,
        avgArticleLength: 400,
        updateFrequency: 'daily',
        weight: 0.9,
        categories: []
    }
};

/**
 * Calculate composite source score (0-1 scale)
 * Weighted: Credibility 40% + Staff 30% + Bureaus 30%
 */
export const calculateSourceScore = (sourceName) => {
    const key = Object.keys(SOURCE_METRICS).find(k =>
        sourceName.toLowerCase().replace(/\s+/g, '').includes(k)
    ) || 'default';

    const source = SOURCE_METRICS[key];

    // Credibility component (max 2.0, normalize to 0-1)
    const credibilityScore = (source.credibility / 2.0) * 0.4;

    // Staff size component (max 5500, normalize to 0-1)
    const maxStaff = 5500;
    const staffScore = Math.min(source.staffSize / maxStaff, 1) * 0.3;

    // Bureau coverage component (max 250, normalize to 0-1)
    const maxBureaus = 250;
    const bureauScore = Math.min(source.bureaus / maxBureaus, 1) * 0.3;

    return credibilityScore + staffScore + bureauScore;
};

/**
 * Get category-specific weight for source
 * Returns higher weight if source is strong in that category
 */
export const getSourceWeightForCategory = (sourceName, category) => {
    const key = Object.keys(SOURCE_METRICS).find(k =>
        sourceName.toLowerCase().replace(/\s+/g, '').includes(k)
    ) || 'default';

    const source = SOURCE_METRICS[key];

    // If source covers this category, use full weight
    if (!source.categories || source.categories.includes(category)) {
        return source.weight;
    }

    // Reduce weight for categories outside source's focus
    return source.weight * 0.7; // 30% penalty
};

/**
 * Get credibility stars for UI display (1-5)
 */
export const getCredibilityStars = (sourceName) => {
    const key = Object.keys(SOURCE_METRICS).find(k =>
        sourceName.toLowerCase().replace(/\s+/g, '').includes(k)
    ) || 'default';

    const source = SOURCE_METRICS[key];
    // Convert 0-2 credibility scale to 1-5 stars
    return Math.round((source.credibility / 2.0) * 5);
};
