/**
 * Market Data Service
 * Fetches real crypto data from CoinGecko (Free API)
 * Simulates global indices (S&P 500, NIFTY) since free APIs for these are limited.
 */

// CoinGecko API for Crypto
const CG_API = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,cardano,ripple&vs_currencies=usd,inr&include_24hr_change=true";

export const fetchMarketData = async () => {
    try {
        // 1. Fetch Real Crypto Data
        const cryptoResponse = await fetch(CG_API);
        const cryptoData = await cryptoResponse.json();

        // Format Crypto
        const cryptoItems = [
            {
                name: "BTC",
                price: `$${cryptoData.bitcoin.usd.toLocaleString()}`,
                change: cryptoData.bitcoin.usd_24h_change,
                type: 'crypto'
            },
            {
                name: "ETH",
                price: `$${cryptoData.ethereum.usd.toLocaleString()}`,
                change: cryptoData.ethereum.usd_24h_change,
                type: 'crypto'
            },
            {
                name: "SOL",
                price: `$${cryptoData.solana.usd.toLocaleString()}`,
                change: cryptoData.solana.usd_24h_change,
                type: 'crypto'
            }
        ];

        // 2. Simulate Indices (random micro-movements around base values to look alive)
        // Base values as of roughly 2024/2025 levels
        const indices = [
            { name: "S&P 500", base: 5200 },
            { name: "NASDAQ", base: 16400 },
            { name: "NIFTY 50", base: 22500 },
            { name: "SENSEX", base: 74000 },
            { name: "Gold", base: 2150 }
        ];

        const indexItems = indices.map(idx => {
            // Random flux +/- 0.5%
            const flux = (Math.random() - 0.5) * 10;
            const price = idx.base + flux;
            const changePercent = (Math.random() - 0.45) * 1.5; // Slight bullish bias simulation

            return {
                name: idx.name,
                price: Math.round(price).toLocaleString(),
                change: changePercent,
                type: 'index'
            };
        });

        return [...indexItems, ...cryptoItems];

    } catch (error) {
        console.error("Market data fetch failed:", error);
        return [];
    }
};
