
import { fetchCurrencyRates, fetchCommodities } from './src/services/indianMarketService.js';

async function testMarketData() {
    console.log("Testing Currency Fetch...");
    try {
        const currencies = await fetchCurrencyRates();
        console.log("Currencies:", JSON.stringify(currencies, null, 2));
    } catch (e) {
        console.error("Currency Fetch Failed:", e);
    }

    console.log("\nTesting Commodities Fetch...");
    try {
        const commodities = await fetchCommodities();
        console.log("Commodities:", JSON.stringify(commodities, null, 2));
    } catch (e) {
        console.error("Commodities Fetch Failed:", e);
    }
}

testMarketData();
