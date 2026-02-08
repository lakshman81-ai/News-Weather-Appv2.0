
import { composeBalancedFeed, extractGeography } from './frontPageComposer.js';

// Simple Test Runner
function runTests() {
    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`✅ PASS: ${message}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${message}`);
            failed++;
        }
    }

    console.log('--- Starting Tests: FrontPageComposer ---');

    // TEST 1: Extract Geography
    assert(extractGeography('Election in Chennai', 'Voting starts') === 'chennai', 'Geo: Chennai');
    assert(extractGeography('New factory in Trichy', '') === 'trichy', 'Geo: Trichy');
    assert(extractGeography('Tamil Nadu budget', '') === 'tamil-nadu', 'Geo: Tamil Nadu');
    assert(extractGeography('PM Modi visits Delhi', '') === 'india', 'Geo: India');
    assert(extractGeography('Global warming report', 'UN says') === 'global', 'Geo: Global');

    // TEST 2: Diversity Constraints (Topic)
    // Constraint: Max 40% per topic (8/20).
    // Constraint: Max 30% per geo (6/20).
    // We want to test Topic limit, so we must ensure Geo limit isn't hit.
    // We rotate 4 geos: chennai, trichy, tamil-nadu, india. Max per geo allowed is 6.
    // If we have 20 articles, 5 of each geo, we are safe (5 < 6).
    const geos = ['Chennai', 'Trichy', 'Tamil Nadu', 'India'];

    const articlesTopic = Array.from({ length: 20 }, (_, i) => ({
        title: `Article ${i} ${geos[i % 4]}`,
        section: i < 10 ? 'politics' : 'sports', // 10 politics, 10 sports
        impactScore: 100 - i,
        description: '...'
    }));

    const feedTopic = composeBalancedFeed(articlesTopic, 20);
    const politicsCount = feedTopic.filter(a => a.section === 'politics').length;

    // Max 40% of 20 = 8. Expect 8 politics.
    // Sports: 10 available. BUT Sports is also a topic, so it is ALSO limited to 8!
    // Geo distribution: 20 items distributed among 4 geos (5 each).
    // 5 < 6, so Geo limit shouldn't trigger.
    // Total expected: 8 politics + 8 sports = 16.

    assert(politicsCount === 8, `Topic Limit: Got ${politicsCount}, Expected 8`);
    assert(feedTopic.length === 16, `Total Selected (Topic Test): Expected 16, Got ${feedTopic.length}`);


    // TEST 3: Diversity Constraints (Geo)
    // Constraint: Max 30% per geo (6/20).
    // We want to test Geo limit (Chennai), so we must ensure Topic limit isn't hit.
    // We rotate 5 topics to avoid topic limit (Max 8). 20/5 = 4 per topic. 4 < 8. Safe.
    const topics = ['A', 'B', 'C', 'D', 'E'];

    const articlesGeo = Array.from({ length: 20 }, (_, i) => ({
        title: i < 10 ? 'Chennai Rains' : 'World News', // 10 Chennai, 10 World (Global)
        section: topics[i % 5],
        impactScore: 100 - i,
        description: i < 10 ? 'Floods' : '...'
    }));

    const feedGeo = composeBalancedFeed(articlesGeo, 20);
    const chennaiCount = feedGeo.filter(a => extractGeography(a.title, a.description) === 'chennai').length;

    // Max 30% of 20 = 6. Expect 6 Chennai.
    // Global: 10 available. But global is also a geo, so it is limited to 6 too!
    // So expected: 6 Chennai + 6 Global = 12.

    assert(chennaiCount === 6, `Geo Limit: Got ${chennaiCount}, Expected 6`);
    assert(feedGeo.length === 12, `Total Selected (Geo Test): Expected 12 (6 Chennai + 6 Global), Got ${feedGeo.length}`);

    // TEST 4: Impact Score Sorting
    const mixedArticles = [
        { title: 'Low Score', impactScore: 10, section: 'A' },
        { title: 'High Score', impactScore: 90, section: 'B' },
        { title: 'Mid Score', impactScore: 50, section: 'C' }
    ];
    const sortedFeed = composeBalancedFeed(mixedArticles, 20);
    assert(sortedFeed[0].title === 'High Score', 'Sorting: Highest score first');
    assert(sortedFeed[1].title === 'Mid Score', 'Sorting: Middle score second');
    assert(sortedFeed[2].title === 'Low Score', 'Sorting: Lowest score last');

    // TEST 5: Custom Configuration
    // Set 20% max topic (4 articles) and 50% max geo (10 articles)
    const customArticles = Array.from({ length: 20 }, (_, i) => ({
        title: `Article ${i}`,
        section: i < 10 ? 'politics' : 'sports',
        impactScore: 100 - i,
        description: 'Global news'
    }));

    // custom config: max topic 20% (4 items), max geo 50% (10 items)
    const customFeed = composeBalancedFeed(customArticles, 20, 20, 50);
    const customPolitics = customFeed.filter(a => a.section === 'politics').length;

    // Max 20% of 20 = 4
    assert(customPolitics === 4, `Custom Topic Limit: Got ${customPolitics}, Expected 4`);


    console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) throw new Error(`${failed} tests failed`);
}

runTests();
