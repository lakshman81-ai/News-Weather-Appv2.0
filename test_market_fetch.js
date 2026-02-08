import { fetchAllMarketData } from './src/services/indianMarketService.js';

// Polyfill for fetch and AbortController if running in older node env
// But we are in a modern environment usually.
// Note: 'fetch' is available in Node 18+.

async function runTest() {
    console.log("Starting Market Data Fetch Test...");
    try {
        const data = await fetchAllMarketData();
        console.log("--- FETCH COMPLETE ---");

        console.log("Indices:", data.indices.length);
        if (data.indices.length > 0) console.log("Sample Index:", data.indices[0]);

        console.log("Movers (Gainers):", data.movers.gainers.length);
        console.log("Movers (Losers):", data.movers.losers.length);

        console.log("Sectorals:", data.sectorals.length);

        console.log("Commodities:", data.commodities.length);
        if (data.commodities.length > 0) console.log("Sample Commodity:", data.commodities[0]);

        console.log("Currencies:", data.currencies.length);
        if (data.currencies.length > 0) console.log("Sample Currency:", data.currencies[0]);

        console.log("IPO Upcoming:", data.ipo.upcoming.length);

        console.log("Errors:", data.errors);

    } catch (e) {
        console.error("Test Failed:", e);
    }
}

runTest();
