import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { fetchAllMarketData } from '../services/indianMarketService';

const MarketContext = createContext(null);

const CACHE_KEY = 'market_cache';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export function MarketProvider({ children }) {
    const [marketData, setMarketData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastFetch, setLastFetch] = useState(null);

    const loadMarketData = useCallback(async (forceRefresh = false) => {
        // Check cache first
        if (!forceRefresh) {
            try {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Date.now() - parsed.fetchedAt < CACHE_DURATION) {
                        console.log('[MarketContext] Using cached data');
                        setMarketData(parsed);
                        setLoading(false);
                        setLastFetch(parsed.fetchedAt);
                        return;
                    }
                }
            } catch (e) {
                console.warn('[MarketContext] Cache read failed');
            }
        }

        setLoading(true);
        setError(null);

        try {
            const data = await fetchAllMarketData();
            setMarketData(data);
            setLastFetch(Date.now());

            // Save to cache
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));

            console.log('[MarketContext] ✅ Market data loaded');
        } catch (err) {
            console.error('[MarketContext] ❌ Failed to load market data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMarketData();
    }, [loadMarketData]);

    const refreshMarket = useCallback(() => {
        return loadMarketData(true);
    }, [loadMarketData]);

    return (
        <MarketContext.Provider value={{
            marketData,
            loading,
            error,
            lastFetch,
            refreshMarket
        }}>
            {children}
        </MarketContext.Provider>
    );
}

export function useMarket() {
    const context = useContext(MarketContext);
    if (!context) {
        throw new Error('useMarket must be used within MarketProvider');
    }
    return context;
}
