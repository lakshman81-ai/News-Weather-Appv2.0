import { computeImpactScore } from '../services/rssAggregator.js';
import { getSettings } from './storage.js';

const TEST_ARTICLES = [
    {
        title: "Millions affected by Chennai floods",
        description: "Heavy rains in Tamil Nadu capital have caused massive flooding affecting 5 million people.",
        imageUrl: "https://example.com/floods.jpg",
        section: "chennai",
        publishedAt: Date.now() - (1 * 60 * 60 * 1000), // 1 hour old
        source: "The Hindu"
    },
    {
        title: "Hero rescues child from burning building",
        description: "A brave firefighter in Mumbai saved a child from a tragic fire, creating a moment of hope.",
        imageUrl: "https://youtube.com/watch?v=abc",
        section: "india",
        publishedAt: Date.now() - (2 * 60 * 60 * 1000), // 2 hours old
        source: "NDTV"
    },
    {
        title: "Tech company announces new CEO",
        description: "Silicon Valley startup announces John Doe as new CEO replacing the founder.",
        imageUrl: null,
        section: "technology",
        publishedAt: Date.now() - (5 * 60 * 60 * 1000), // 5 hours old
        source: "TechCrunch"
    }
];

export function runScoringTests() {
    const settings = getSettings();
    console.log(`\n=== SCORING TEST (New Scoring: ${settings.enableNewScoring}) ===`);

    TEST_ARTICLES.forEach(article => {
        // Mocking some fields expected by computeImpactScore
        const item = {
            ...article,
            sentiment: { label: 'neutral' }, // Mock sentiment
            keywords: []
        };

        const score = computeImpactScore(item, article.section);

        console.log(`\nTitle: ${article.title}`);
        console.log(`Section: ${article.section}`);
        console.log(`Score: ${score.toFixed(2)}`);
    });
    console.log('\n=================================================\n');
}
