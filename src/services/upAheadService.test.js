import { extractFutureDate, processUpAheadData } from './upAheadService.js';

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

    console.log('--- Starting Tests: UpAheadService ---');

    // MOCK DATE: Today is Feb 5, 2026
    const originalDate = Date;
    const MOCK_TODAY = new Date('2026-02-05T12:00:00Z');

    // Override global Date for predictable testing
    global.Date = class extends Date {
        constructor(...args) {
            if (args.length === 0) return new originalDate(MOCK_TODAY.getTime());
            return new originalDate(...args);
        }
        static now() {
            return MOCK_TODAY.getTime();
        }
    };

    // TEST 1: Old Story Freshness Check (processUpAheadData)
    // Story published Oct 22, 2025 (months ago). Settings say hide older than 60 hours.
    const oldItem = {
        id: 'old-1',
        title: 'School Holiday Oct 22',
        pubDate: new Date('2025-10-22T08:00:00Z'),
        category: 'alerts',
        extractedDate: new Date('2026-10-22T00:00:00Z') // Assume extractor failed and picked future
    };

    const settingsStrict = { hideOlderThanHours: 60 };
    const processedStrict = processUpAheadData([oldItem], settingsStrict);

    // Should be empty because pubDate is ancient
    assert(processedStrict.timeline.length === 0, 'Old story (Oct 2025) should be filtered out by 60h rule');


    // TEST 2: Extract Future Date with Context (Fixing the "Next Year" bug)
    // Text: "Oct 22"
    // PubDate: Oct 20, 2025
    // Today: Feb 5, 2026
    // Expected: Oct 22, 2025 (Past) -> NOT Oct 22, 2026

    const text = "School Holiday: Schools closed on Oct 22 due to rain";
    const pubDateOld = new Date('2025-10-20T08:00:00Z');

    const extracted = extractFutureDate(text, pubDateOld);

    if (extracted) {
        // We expect it to be 2025
        assert(extracted.getFullYear() === 2025, `Extracted Year should be 2025 (Context: PubDate 2025), Got ${extracted.getFullYear()}`);
    } else {
        // If it returns null because it's in the past (logic I didn't verify closely), that's also acceptable?
        // Wait, extractFutureDate returns a Date object.
        console.log('Extracted Date:', extracted);
        assert(false, 'Should have extracted a date (Oct 22, 2025)');
    }


    // TEST 3: Future Event in Future Article
    // Text: "Concert on March 15"
    // PubDate: Feb 10, 2026
    // Today: Feb 5, 2026
    // Expected: March 15, 2026

    const textFuture = "Big Concert happening on March 15";
    const pubDateFuture = new Date('2026-02-10T08:00:00Z'); // Slightly in future or recent

    const extractedFuture = extractFutureDate(textFuture, pubDateFuture);
    assert(extractedFuture.getFullYear() === 2026, `Future Year should be 2026, Got ${extractedFuture.getFullYear()}`);
    assert(extractedFuture.getMonth() === 2, `Month should be March (2), Got ${extractedFuture.getMonth()}`);
    assert(extractedFuture.getDate() === 15, `Day should be 15, Got ${extractedFuture.getDate()}`);


    // TEST 4: Next Year Event
    // Text: "Olympics in July" (Article published Dec 2026)
    // Today: Feb 2026 (Wait, published in future? Let's say published Dec 2025, text says Jan 5)

    const textNextYear = "Festival on Jan 5";
    const pubDateDec = new Date('2025-12-25T00:00:00Z');

    // Pub is Dec 2025. Event is Jan 5.
    // Should be Jan 5, 2026.
    const extractedNext = extractFutureDate(textNextYear, pubDateDec);
    assert(extractedNext.getFullYear() === 2026, `New Year logic: Expected 2026, Got ${extractedNext.getFullYear()}`);


    console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed`);

    // Restore Date
    global.Date = originalDate;

    if (failed > 0) process.exit(1);
}

runTests();
