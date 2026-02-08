import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchSectionNews, clearNewsCache } from '../services/rssAggregator';
import { composeBalancedFeed } from '../services/frontPageComposer';
import { getSettings } from '../utils/storage';
import { useSettings } from './SettingsContext';
import { runFullAudit } from '../utils/newsAudit';

const NewsContext = createContext();

const PRIORITY_SECTIONS = ['world', 'india', 'chennai', 'trichy'];

export function NewsProvider({ children }) {
    const { settingsVersion } = useSettings();
    const prevVersion = useRef(settingsVersion);
    const [newsData, setNewsData] = useState({});
    const [breakingNews, setBreakingNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadedSections, setLoadedSections] = useState([]);
    const [errors, setErrors] = useState({});
    const [lastFetch, setLastFetch] = useState(0);
    const [auditResults, setAuditResults] = useState({});


    const loadSection = useCallback(async (section) => {
        // Prevent duplicate loads if already loaded or in loadedSections
        // Note: Ideally we should track "loadingSections" to prevent double-fetch while in flight,
        // but for now checking loadedSections prevents re-fetch after success.
        if (loadedSections.includes(section)) return;

        console.log(`[NewsContext] Lazy loading section: ${section}`);

        try {
            const settings = getSettings();
            // Respect settings enablement
            if (settings.sections[section] && !settings.sections[section].enabled) {
                console.log(`[NewsContext] Skipping lazy load for disabled section: ${section}`);
                return;
            }

            const count = settings.sections[section]?.count || 10;
            const articles = await fetchSectionNews(section, count + 5, settings.newsSources);

            setNewsData(prev => ({ ...prev, [section]: articles || [] }));

        } catch (err) {
            console.error(`[NewsContext] Failed to load section ${section}:`, err);
            setErrors(prev => ({ ...prev, [section]: err.message }));
        } finally {
            // Mark as loaded regardless of success/failure so UI can show content or error
            setLoadedSections(prev => [...new Set([...prev, section])]);
        }
    }, [loadedSections]);

    const refreshNews = useCallback(async (specificSections = null) => {
        setLoading(true);
        const fetchStartTime = Date.now();

        try {
            const settings = getSettings();
            if (!settings) {
                console.error('[NewsContext] Settings not available');
                return;
            }

            const allSections = ['world', 'india', 'chennai', 'trichy', 'local', 'social', 'entertainment', 'business', 'technology'];
            const sectionsToFetch = specificSections || allSections;

            // Prioritize Sections: Main Page (High) -> Others (Low)
            const highPriority = sectionsToFetch.filter(s => PRIORITY_SECTIONS.includes(s));
            const lowPriority = sectionsToFetch.filter(s => !PRIORITY_SECTIONS.includes(s));

            const batches = [highPriority, lowPriority].filter(b => b.length > 0);

            let allCollectedResults = {};

            for (const batch of batches) {
                const batchResults = {};
                const batchErrors = {};

                console.log(`[NewsContext] Fetching batch: ${batch.join(', ')}`);

                await Promise.all(batch.map(async (key) => {
                    if (settings.sections[key]?.enabled !== false) {
                        try {
                            const count = settings.sections[key]?.count || 10;
                            const articles = await fetchSectionNews(key, count + 5, settings.newsSources);

                            if (articles && Array.isArray(articles)) {
                                batchResults[key] = articles;
                            } else {
                                batchResults[key] = [];
                            }
                        } catch (err) {
                            console.error(`[NewsContext] Error ${key}:`, err);
                            batchErrors[key] = err.message;
                            batchResults[key] = [];
                        }
                    }
                }));

                // Incremental Update Logic
                // We need to redistribute the *accumulated* results to ensure classification moves items correctly
                // across sections that might be in different batches.
                // However, doing full redistribution on partial data is fine.

                Object.assign(allCollectedResults, batchResults);

                // --- REDISTRIBUTION PASS ---
                const allFetched = Object.values(allCollectedResults).flat();
                const redistributed = {};

                // Initialize buckets for all fetched keys to ensure clearing
                Object.keys(allCollectedResults).forEach(key => redistributed[key] = []);

                allFetched.forEach(item => {
                    const section = item.section || 'uncategorized';
                    if (!redistributed[section]) redistributed[section] = [];
                    redistributed[section].push(item);
                });

                Object.keys(redistributed).forEach(key => {
                    redistributed[key].sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0));
                });

                // Generate Balanced Front Page
                // We use all unique articles available in the current redistribution
                const allCurrentArticles = Object.values(redistributed).flat();
                // We might want to include previously loaded data if this is a partial update,
                // but 'allCollectedResults' accumulates across batches in this function scope.
                // So 'allFetched' (which drives 'redistributed') contains everything fetched *in this refresh session*.
                // To be truly global, we might need access to 'newsData' but that's state and might be stale or partial.
                // Since 'allCollectedResults' accumulates high+low priority in the loop, by the end of loop it has everything.
                // For the first batch (high priority), we generate a front page from that.
                // For the second batch (low priority), we generate from high+low.

                const frontPage = composeBalancedFeed(
                    allCurrentArticles,
                    20,
                    settings.maxTopicPercent || 40,
                    settings.maxGeoPercent || 30
                );

                setNewsData(prev => ({
                    ...prev,
                    ...redistributed,
                    frontPage
                }));
                setErrors(prev => ({ ...prev, ...batchErrors }));

                // Update loaded sections
                setLoadedSections(prev => [...new Set([...prev, ...Object.keys(batchResults)])]);

                // Breaking News Update (Incremental)
                const breaking = allFetched
                    .filter(item => item.isBreaking || (item.breakingScore && item.breakingScore > 1.5))
                    .sort((a, b) => (b.breakingScore || 0) - (a.breakingScore || 0))
                    .slice(0, 3);
                setBreakingNews(breaking);
            }

            setLastFetch(Date.now());

            const fetchDuration = Date.now() - fetchStartTime;
            console.log(`[NewsContext] ✅ Refresh complete in ${fetchDuration}ms`);

        } catch (error) {
            console.error("[NewsContext] ❌ Fatal refresh error:", {
                errorMessage: error.message,
                errorStack: error.stack,
                timestamp: new Date().toISOString()
            });
        } finally {
            setLoading(false);
        }
    }, []);

    // Audit Logic: Runs after fetch completes (idle time)
    useEffect(() => {
        if (lastFetch === 0) return;

        console.log('[NewsContext] Scheduling audit...');
        const timer = setTimeout(async () => {
            try {
                const settings = getSettings();
                // Pass current newsData snapshot
                const results = await runFullAudit(newsData, settings);
                setAuditResults(prev => ({ ...prev, ...results }));
            } catch (err) {
                console.error('[NewsContext] Audit failed:', err);
            }
        }, 3000); // 3 seconds delay for "pop-in" effect

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastFetch]); // Only run when a fetch cycle completes

    // Refresh when settings are saved (settingsVersion bumps)
    useEffect(() => {
        if (prevVersion.current !== settingsVersion) {
            console.log('[NewsContext] Settings changed (v' + settingsVersion + ') - refreshing');
            clearNewsCache();
            prevVersion.current = settingsVersion;
            refreshNews();
        }
    }, [settingsVersion, refreshNews]);

    useEffect(() => {
        console.log('[NewsContext] Mounting - Initial fetch (Priority Only)');
        // Initial Fetch: Only Priority Sections
        refreshNews(PRIORITY_SECTIONS);

        const interval = setInterval(() => {
            console.log('[NewsContext] Auto-refresh (5min cycle)');
            // Auto refresh: Update what we have loaded, or just priority?
            // Safer to refresh priority + currently loaded
            refreshNews(PRIORITY_SECTIONS);
        }, 5 * 60 * 1000);

        return () => {
            clearInterval(interval);
            console.log('[NewsContext] Unmounting');
        };
    }, [refreshNews]);

    return (
        <NewsContext.Provider value={{
            newsData,
            loading,
            errors,
            refreshNews,
            breakingNews,
            lastFetch,
            loadSection,
            loadedSections,
            auditResults
        }}>
            {children}
        </NewsContext.Provider>
    );
}

export function useNews() {
    return useContext(NewsContext);
}
