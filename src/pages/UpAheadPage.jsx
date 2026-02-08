import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useWatchlist } from '../hooks/useWatchlist';
import { downloadCalendarEvent } from '../utils/calendar';
import { fetchUpAheadData } from '../services/upAheadService';
import { useSettings } from '../context/SettingsContext';
import './UpAhead.css';

// Simple in-memory cache to prevent re-fetching on every tab switch
// Stores: { [settingsHash]: { data, timestamp } }
const dataCache = {};
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function UpAheadPage() {
    const { settings } = useSettings();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('feed'); // 'feed' | 'plan'
    const { toggleWatchlist, isWatched } = useWatchlist();
    const hasFetched = useRef(false);

    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            const upAheadSettings = settings.upAhead || {
                categories: { movies: true, events: true, festivals: true, alerts: true, sports: true },
                locations: ['Chennai']
            };

            // Generate a simple hash of settings to invalidate cache if settings change
            const settingsHash = JSON.stringify(upAheadSettings);

            // Check Cache
            const cached = dataCache[settingsHash];
            if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
                console.log('[UpAhead] Using cached data');
                setData(cached.data);
                setLoading(false);
                return;
            }

            // Only show loading if we don't have cached data or it expired
            if (isMounted) setLoading(true);

            try {
                const fetchedData = await fetchUpAheadData(upAheadSettings);
                if (isMounted) {
                    setData(fetchedData);
                    setLoading(false);
                    hasFetched.current = true;
                    // Update Cache
                    dataCache[settingsHash] = {
                        data: fetchedData,
                        timestamp: Date.now()
                    };
                }
            } catch (err) {
                if (isMounted) {
                    console.error("Failed to load Up Ahead data", err);
                    setLoading(false);
                    hasFetched.current = true;
                }
            }
        };

        // If we already have data in state (e.g. from HMR or re-render), don't reload unless settings changed
        // But here we rely on the effect dependency [settings.upAhead] which handles changes.
        // We use the cache to avoid the API call.
        loadData();

        return () => {
            isMounted = false;
        };
    }, [settings.upAhead]);

    const handleRetry = () => {
        const upAheadSettings = settings.upAhead || {};
        const hash = JSON.stringify(upAheadSettings);
        delete dataCache[hash];
        setData(null);
        setLoading(true);
    };

    // Re-trigger fetch when data is cleared for retry
    useEffect(() => {
        if (loading && !data) {
            // The main loadData effect re-runs via settings.upAhead dep,
            // but for retry we need a manual trigger since settings didn't change.
            // The setLoading(true) + setData(null) will re-render to the loading state,
            // and the main effect won't re-run (deps unchanged).
            // So we fire a one-off fetch here.
            let cancelled = false;
            const retryFetch = async () => {
                const upAheadSettings = settings.upAhead || {
                    categories: { movies: true, events: true, festivals: true, alerts: true, sports: true },
                    locations: ['Chennai']
                };
                try {
                    const fetchedData = await fetchUpAheadData(upAheadSettings);
                    if (!cancelled) {
                        setData(fetchedData);
                        setLoading(false);
                        const hash = JSON.stringify(upAheadSettings);
                        dataCache[hash] = { data: fetchedData, timestamp: Date.now() };
                    }
                } catch (err) {
                    if (!cancelled) {
                        console.error('[UpAhead] Retry failed', err);
                        setLoading(false);
                    }
                }
            };
            // Only run if hasFetched is true (i.e. initial load already happened)
            if (hasFetched.current) retryFetch();
            return () => { cancelled = true; };
        }
    }, [loading, data, settings.upAhead]);

    if (loading) {
        return (
            <div className="page-container">
                <Header title="Up Ahead" icon="🗓️" />
                <div className="loading">
                    <div className="loading__spinner"></div>
                    <p>Scanning horizon for {settings.upAhead?.locations?.join(', ') || 'events'}...</p>
                </div>
            </div>
        );
    }

    if (!data || !data.timeline || data.timeline.length === 0) {
         return (
            <div className="page-container">
                <Header title="Up Ahead" icon="🗓️" />
                <div className="empty-state">
                    <span style={{ fontSize: '3rem' }}>🔭</span>
                    <h3>Nothing on the radar</h3>
                    <p>No upcoming events found for {settings.upAhead?.locations?.join(', ') || 'your locations'}.</p>
                    <button
                        onClick={handleRetry}
                        className="btn btn--primary"
                        style={{ marginTop: '1rem' }}
                    >
                        Retry
                    </button>
                    <div style={{ marginTop: '0.75rem' }}>
                         <small>Try adding more locations or categories in <Link to="/settings" style={{ color: 'var(--accent-primary)' }}>Settings</Link>.</small>
                    </div>
                </div>
            </div>
        );
    }

    // Phase 2: Alerts Banner (Priority: Weather > Alerts)
    const weatherAlerts = data.sections?.weather_alerts || [];
    const generalAlerts = data.sections?.alerts || [];
    const highPriorityAlert = weatherAlerts[0] || generalAlerts[0] || null;
    const alertIcon = weatherAlerts.length > 0 ? '🌪️' : '⚠️';
    const alertTitle = weatherAlerts.length > 0 ? 'Weather Warning' : 'Worth Knowing';

    // Helper to format date concisely: "Sun, 08-Feb"
    const formatConciseDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;

        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); // Sun
        const dayNum = d.getDate().toString().padStart(2, '0'); // 08
        const month = d.toLocaleDateString('en-US', { month: 'short' }); // Feb

        return `${dayName}, ${dayNum}-${month}`;
    };

    return (
        <div className="page-container up-ahead-page">
            <Header title="Up Ahead" icon="🗓️" />

            {/* Source Indicator */}
            <div style={{
                textAlign: 'center',
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                padding: '4px',
                background: 'var(--bg-secondary)'
            }}>
                Live Feed • {settings.upAhead?.locations?.join(', ') || 'All Locations'}
            </div>

            {/* Alert Banner */}
            {highPriorityAlert && (
                <div className={`ua-alert-banner ${weatherAlerts.length > 0 ? 'weather-alert' : ''}`}>
                    <span className="ua-alert-icon">{alertIcon}</span>
                    <div className="ua-alert-content">
                        <h4>{alertTitle}</h4>
                        <p>{highPriorityAlert.text}</p>
                    </div>
                </div>
            )}

            {/* View Toggle */}
            <div className="ua-view-toggle">
                <button
                    className={`ua-toggle-btn ${view === 'feed' ? 'active' : ''}`}
                    onClick={() => setView('feed')}
                >
                    Timeline
                </button>
                <button
                    className={`ua-toggle-btn ${view === 'plan' ? 'active' : ''}`}
                    onClick={() => setView('plan')}
                >
                    Plan My Week
                </button>
            </div>

            {/* Main Content */}
            {view === 'feed' ? (
                <div className="ua-timeline">
                    {data.timeline?.map((day) => (
                        <div key={day.date} className="ua-day-section">
                            <div className="ua-day-header">
                                <div className="ua-day-label">{day.dayLabel}</div>
                                <div className="ua-date-sub">{day.date}</div>
                            </div>

                            {day.items?.map(item => (
                                <div key={item.id} className="ua-card">
                                    <div className="ua-card-header">
                                        <div className={`ua-type-badge type-${item.type}`}>
                                            {item.type}
                                        </div>
                                        <button
                                            className={`ua-action-btn ${isWatched(item.id) ? 'active' : ''}`}
                                            onClick={() => toggleWatchlist(item.id)}
                                        >
                                            {isWatched(item.id) ? '♥' : '♡'}
                                        </button>
                                    </div>

                                    <div className="ua-card-title">{item.title}</div>
                                    <div className="ua-card-subtitle">
                                        <span>⏰</span> {item.subtitle}
                                    </div>
                                    <p className="ua-card-desc">{item.description}</p>

                                    {item.link && (
                                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="ua-read-more">
                                            Read Source
                                        </a>
                                    )}

                                    <div className="ua-card-footer">
                                        <div className="ua-tags">
                                            {item.tags?.map(tag => (
                                                <span key={tag} className="ua-tag">#{tag}</span>
                                            ))}
                                        </div>
                                        <div className="ua-actions">
                                            <button
                                                className="ua-action-btn"
                                                onClick={() => downloadCalendarEvent(item.title, item.description)}
                                                title="Add to Calendar"
                                            >
                                                📅
                                            </button>
                                            <button className="ua-action-btn" title="Share">
                                                📤
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}

                    {/* Worth Knowing Section (Sections fallback) */}
                    <div className="ua-worth-knowing">
                        {data.sections?.festivals?.length > 0 && (
                            <div className="ua-wk-card">
                                <div className="ua-wk-title">🪔 Festivals & Holidays</div>
                                <ul className="ua-wk-list">
                                    {data.sections.festivals.map((f, i) => (
                                        <li key={i} className="ua-wk-item">
                                            <span className="ua-wk-text">{f.title}</span>
                                            <span className="ua-wk-date">{formatConciseDate(f.date)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {data.sections?.movies?.length > 0 && (
                            <div className="ua-wk-card">
                                <div className="ua-wk-title">🎬 Releasing Soon</div>
                                <ul className="ua-wk-list">
                                    {data.sections.movies.map((m, i) => (
                                        <li key={i} className="ua-wk-item">
                                            <span className="ua-wk-text">{m.title}</span>
                                            <span className="ua-wk-date">{formatConciseDate(m.releaseDate)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Plan My Week View */
                <div className="ua-weekly-plan">
                     {Object.entries(data.weekly_plan || {}).map(([day, items]) => (
                         <div key={day} className="ua-plan-day-row">
                             <div className="ua-plan-day-label">
                                 <span className="ua-day-name">{day}</span>
                             </div>
                             <div className="ua-plan-day-content">
                                 {Array.isArray(items) && items.length > 0 ? (
                                     items.map((item, idx) => (
                                         <a key={idx} href={item.link} target="_blank" rel="noopener noreferrer" className="ua-plan-event-item">
                                             <span className="ua-event-icon">{item.icon}</span>
                                             <span className="ua-event-title">{item.title}</span>
                                         </a>
                                     ))
                                 ) : (
                                     <span className="ua-plan-empty">-</span>
                                 )}
                             </div>
                         </div>
                     ))}
                </div>
            )}
        </div>
    );
}

export default UpAheadPage;
