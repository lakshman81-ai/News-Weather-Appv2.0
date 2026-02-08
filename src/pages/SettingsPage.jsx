import React, { useState, useEffect, useSyncExternalStore } from 'react';
import Header from '../components/Header';
import Toggle from '../components/Toggle';
import { DEFAULT_SETTINGS } from '../utils/storage';
import { useSettings } from '../context/SettingsContext';
import { discoverFeeds } from '../utils/feedDiscovery';
import { APP_VERSION } from '../utils/version';
import logStore from '../utils/logStore';
import { getAllSectionHealth } from '../utils/sectionHealth';

/**
 * Settings Page Component - Vertical Tabs Layout
 */
function SettingsPage() {
    const { settings, updateSettings, reloadSettings } = useSettings();
    const [activeTab, setActiveTab] = useState('general');
    const [saved, setSaved] = useState(false);

    // Feed Discovery State
    const [newFeedUrl, setNewFeedUrl] = useState('');
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [discoveryError, setDiscoveryError] = useState(null);

    // Keyword Input State
    const [keywordInputs, setKeywordInputs] = useState({
        movies: '',
        events: '',
        negative: ''
    });

    if (!settings) return <div className="loading">Loading...</div>;

    const updateNested = (path, value) => {
        const keys = path.split('.');
        const newSettings = { ...settings };
        let obj = newSettings;
        for (let i = 0; i < keys.length - 1; i++) {
            obj[keys[i]] = { ...obj[keys[i]] };
            obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;
        updateSettings(newSettings);
    };

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        reloadSettings();
    };

    const handleReset = () => {
        if (window.confirm('Reset all settings to defaults?')) {
            updateSettings({ ...DEFAULT_SETTINGS });
            reloadSettings();
        }
    };

    const handleAddFeed = async () => {
        if (!newFeedUrl) return;
        setIsDiscovering(true);
        setDiscoveryError(null);

        try {
            const feeds = await discoverFeeds(newFeedUrl);
            if (feeds.length > 0) {
                const bestFeed = feeds[0];
                updateSettings({
                    ...settings,
                    customFeeds: [...(settings.customFeeds || []), { title: bestFeed.title, url: bestFeed.url }]
                });
                setNewFeedUrl('');
            } else {
                setDiscoveryError('No feeds found. Check the URL or try a direct RSS link.');
            }
        } catch (error) {
            void error;
            setDiscoveryError('Error discovering feeds.');
        } finally {
            setIsDiscovering(false);
        }
    };

    const removeCustomFeed = (index) => {
        const newFeeds = [...(settings.customFeeds || [])];
        newFeeds.splice(index, 1);
        updateSettings({ ...settings, customFeeds: newFeeds });
    };

    // --- KEYWORD MANAGEMENT ---
    const addKeyword = (category, word) => {
        if (!word || !word.trim()) return;
        const currentList = settings.upAhead?.keywords?.[category] || [];
        if (!currentList.includes(word.trim())) {
            updateNested(`upAhead.keywords.${category}`, [...currentList, word.trim()]);
        }
        setKeywordInputs({ ...keywordInputs, [category]: '' });
    };

    const removeKeyword = (category, word) => {
        const currentList = settings.upAhead?.keywords?.[category] || [];
        updateNested(`upAhead.keywords.${category}`, currentList.filter(w => w !== word));
    };

    // --- TABS CONFIGURATION ---
    const tabs = [
        { id: 'general', label: 'General', icon: '⚙️' },
        { id: 'ranking', label: 'Custom Ranking', icon: '🧠' },
        { id: 'weather', label: 'Weather', icon: '🌤️' },
        { id: 'sources', label: 'Sources', icon: '📡' },
        { id: 'upahead', label: 'Up Ahead', icon: '🗓️' },
        { id: 'market', label: 'Market', icon: '📈' },
        { id: 'advanced', label: 'Advanced', icon: '🔧' },
        { id: 'debug', label: 'Debug', icon: '🐛' },
    ];

    // --- RENDER CONTENT ---
    const renderContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div className="settings-tab-content">
                        <SectionTitle icon="📱" title="Interface" />
                        <SettingCard>
                            <SettingItem label="Home Layout" subLabel="Timeline / Classic / Newspaper">
                                <select
                                    value={settings.uiMode || 'timeline'}
                                    onChange={(e) => updateSettings({ ...settings, uiMode: e.target.value })}
                                    className="settings-select"
                                >
                                    <option value="timeline">📱 Timeline</option>
                                    <option value="classic">📊 Classic</option>
                                    <option value="newspaper">📰 Newspaper</option>
                                </select>
                            </SettingItem>
                            <SettingItem label="Font Size" subLabel={`${settings.fontSize || 26}px`}>
                                <input
                                    type="range"
                                    min="14"
                                    max="34"
                                    step="1"
                                    value={settings.fontSize || 26}
                                    onChange={(e) => updateSettings({ ...settings, fontSize: parseInt(e.target.value) })}
                                    style={{ width: '100%' }}
                                />
                            </SettingItem>
                        </SettingCard>

                        <SectionTitle icon="🤖" title="AI Configuration" />
                        <SettingCard>
                            <div className="settings-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                                <div className="settings-item__label">
                                    <span>Gemini API Key</span>
                                    <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                                        Required for client-side fallback.
                                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', marginLeft: '4px' }}>Get Key</a>
                                    </small>
                                </div>
                                <input
                                    type="password"
                                    value={settings.geminiKey || ''}
                                    onChange={(e) => updateSettings({ ...settings, geminiKey: e.target.value })}
                                    className="settings-input"
                                    placeholder="Enter API Key"
                                />
                            </div>
                        </SettingCard>
                    </div>
                );

            case 'ranking':
                return (
                    <div className="settings-tab-content">
                        <SectionTitle icon="🎛️" title="Custom Ranking System" />
                        <SettingCard>
                            <div style={{fontSize:'0.8rem', color:'var(--text-muted)', marginBottom:'10px'}}>
                                Configure the weight of each factor in the news ranking algorithm.
                            </div>
                            <SettingItem label="Ranking Method">
                                <select
                                    value={settings.rankingMode || 'smart'}
                                    onChange={(e) => updateSettings({ ...settings, rankingMode: e.target.value })}
                                    className="settings-select"
                                >
                                    <option value="smart">Smart Mix (Impact)</option>
                                    <option value="context-aware">Location/Time Aware (Beta)</option>
                                    <option value="legacy">Legacy (Freshness)</option>
                                </select>
                            </SettingItem>
                            <SettingItem label="Hide Older Than (Hours)">
                                <input type="number" min={1} max={168} value={settings.hideOlderThanHours || 60} onChange={(e) => updateSettings({ ...settings, hideOlderThanHours: parseInt(e.target.value) || 60 })} className="settings-input-number" />
                            </SettingItem>
                            <SettingItem label="Strict Freshness Mode" subLabel="Hide stale stories completely">
                                <Toggle checked={settings.strictFreshness} onChange={(val) => updateSettings({ ...settings, strictFreshness: val })} />
                            </SettingItem>
                            <SettingItem label="Filtering Mode">
                                <select
                                    value={settings.filteringMode || 'source'}
                                    onChange={(e) => updateSettings({ ...settings, filteringMode: e.target.value })}
                                    className="settings-select"
                                >
                                    <option value="source">Source Based</option>
                                    <option value="keyword">Keyword Based</option>
                                </select>
                            </SettingItem>
                            <div style={{ padding: '10px 0', borderTop: '1px solid var(--border-default)' }}>
                                <SettingItem label={`Diversity: Max Topic ${settings.maxTopicPercent || 40}%`}>
                                    <input type="range" min="10" max="100" step="5" value={settings.maxTopicPercent || 40} onChange={(e) => updateSettings({ ...settings, maxTopicPercent: parseInt(e.target.value) })} style={{ width: '100%' }} />
                                </SettingItem>
                                <SettingItem label={`Diversity: Max Geo ${settings.maxGeoPercent || 30}%`}>
                                    <input type="range" min="10" max="100" step="5" value={settings.maxGeoPercent || 30} onChange={(e) => updateSettings({ ...settings, maxGeoPercent: parseInt(e.target.value) })} style={{ width: '100%' }} />
                                </SettingItem>
                            </div>
                            <SettingItem label="Proximity Boost" subLabel="Prioritize local content">
                                <Toggle checked={settings.enableProximityScoring !== false} onChange={(val) => updateSettings({ ...settings, enableProximityScoring: val })} />
                            </SettingItem>
                            <SettingItem label="Enhanced Scoring Algorithm" subLabel="9-Factor Impact Analysis">
                                <Toggle checked={settings.enableNewScoring !== false} onChange={(val) => updateSettings({ ...settings, enableNewScoring: val })} />
                            </SettingItem>
                        </SettingCard>

                        <SectionTitle icon="⚖️" title="Impact Factors" />
                        <SettingCard>
                            {/* Freshness */}
                            <div style={{marginBottom:'15px', borderBottom:'1px solid rgba(255,255,255,0.05)', paddingBottom:'10px'}}>
                                <div className="settings-item__label" style={{color:'var(--accent-primary)', marginBottom:'5px'}}>Freshness</div>
                                <SettingItem label={`Decay Window: ${settings.rankingWeights?.freshness?.decayHours || 26}h`}>
                                    <input type="range" min="12" max="72" value={settings.rankingWeights?.freshness?.decayHours || 26} onChange={(e) => updateNested('rankingWeights.freshness.decayHours', parseInt(e.target.value))} style={{width:'100%'}} />
                                </SettingItem>
                                <SettingItem label={`Max Boost: ${(settings.rankingWeights?.freshness?.maxBoost || 3.0).toFixed(1)}x`}>
                                    <input type="range" min="1" max="5" step="0.5" value={settings.rankingWeights?.freshness?.maxBoost || 3.0} onChange={(e) => updateNested('rankingWeights.freshness.maxBoost', parseFloat(e.target.value))} style={{width:'100%'}} />
                                </SettingItem>
                            </div>

                            {/* Source */}
                            <div style={{marginBottom:'15px', borderBottom:'1px solid rgba(255,255,255,0.05)', paddingBottom:'10px'}}>
                                <div className="settings-item__label" style={{color:'var(--accent-primary)', marginBottom:'5px'}}>Source Authority</div>
                                <SettingItem label={`Tier 1 Boost: ${(settings.rankingWeights?.source?.tier1Boost || 5.0).toFixed(1)}`}>
                                    <input type="range" min="1" max="10" step="0.5" value={settings.rankingWeights?.source?.tier1Boost || 5.0} onChange={(e) => updateNested('rankingWeights.source.tier1Boost', parseFloat(e.target.value))} style={{width:'100%'}} />
                                </SettingItem>
                            </div>

                            {/* Visual */}
                            <div style={{marginBottom:'15px', borderBottom:'1px solid rgba(255,255,255,0.05)', paddingBottom:'10px'}}>
                                <div className="settings-item__label" style={{color:'var(--accent-primary)', marginBottom:'5px'}}>Visuals</div>
                                <SettingItem label={`Video Boost: ${(settings.rankingWeights?.visual?.videoBoost || 1.3).toFixed(2)}x`}>
                                    <input type="range" min="1" max="2" step="0.05" value={settings.rankingWeights?.visual?.videoBoost || 1.3} onChange={(e) => updateNested('rankingWeights.visual.videoBoost', parseFloat(e.target.value))} style={{width:'100%'}} />
                                </SettingItem>
                                <SettingItem label={`Image Boost: ${(settings.rankingWeights?.visual?.imageBoost || 1.15).toFixed(2)}x`}>
                                    <input type="range" min="1" max="2" step="0.05" value={settings.rankingWeights?.visual?.imageBoost || 1.15} onChange={(e) => updateNested('rankingWeights.visual.imageBoost', parseFloat(e.target.value))} style={{width:'100%'}} />
                                </SettingItem>
                            </div>

                            {/* Context & Keywords */}
                            <div>
                                <div className="settings-item__label" style={{color:'var(--accent-primary)', marginBottom:'5px'}}>Context & Keywords</div>
                                <SettingItem label={`Keyword Match: +${settings.rankingWeights?.keyword?.matchBoost || 2.0}`}>
                                    <input type="range" min="0" max="5" step="0.5" value={settings.rankingWeights?.keyword?.matchBoost || 2.0} onChange={(e) => updateNested('rankingWeights.keyword.matchBoost', parseFloat(e.target.value))} style={{width:'100%'}} />
                                </SettingItem>
                                <SettingItem label={`City Match: ${(settings.rankingWeights?.geo?.cityMatch || 1.5).toFixed(1)}x`}>
                                    <input type="range" min="1" max="3" step="0.1" value={settings.rankingWeights?.geo?.cityMatch || 1.5} onChange={(e) => updateNested('rankingWeights.geo.cityMatch', parseFloat(e.target.value))} style={{width:'100%'}} />
                                </SettingItem>
                                <SettingItem label={`Weekend Boost: ${(settings.rankingWeights?.temporal?.weekendBoost || 2.0).toFixed(1)}x`}>
                                    <input type="range" min="1" max="3" step="0.1" value={settings.rankingWeights?.temporal?.weekendBoost || 2.0} onChange={(e) => updateNested('rankingWeights.temporal.weekendBoost', parseFloat(e.target.value))} style={{width:'100%'}} />
                                </SettingItem>
                            </div>
                        </SettingCard>

                        <SectionTitle icon="⚡" title="Audit Thresholds" />
                        <SettingCard>
                            <SettingItem label={`Consensus: Min ${settings.rankingWeights?.audit?.consensusThreshold || 2} Sources`}>
                                <input type="range" min="2" max="5" step="1" value={settings.rankingWeights?.audit?.consensusThreshold || 2} onChange={(e) => updateNested('rankingWeights.audit.consensusThreshold', parseInt(e.target.value))} style={{width:'100%'}} />
                            </SettingItem>
                            <SettingItem label={`Anomaly: ${settings.rankingWeights?.audit?.anomalySigma || 2.0} Sigma`}>
                                <input type="range" min="1" max="3" step="0.1" value={settings.rankingWeights?.audit?.anomalySigma || 2.0} onChange={(e) => updateNested('rankingWeights.audit.anomalySigma', parseFloat(e.target.value))} style={{width:'100%'}} />
                            </SettingItem>
                        </SettingCard>
                    </div>
                );

            case 'weather':
                return (
                    <div className="settings-tab-content">
                        <SectionTitle icon="🌤️" title="Weather Models" />
                        <SettingCard>
                            <SettingItem label="ECMWF (European)" subLabel="Most Accurate">
                                <Toggle checked={settings.weather?.models?.ecmwf !== false} onChange={(val) => updateNested('weather.models.ecmwf', val)} />
                            </SettingItem>
                            <SettingItem label="GFS (NOAA)" subLabel="Good Precipitation">
                                <Toggle checked={settings.weather?.models?.gfs !== false} onChange={(val) => updateNested('weather.models.gfs', val)} />
                            </SettingItem>
                            <SettingItem label="ICON (DWD)" subLabel="Excellent Coverage">
                                <Toggle checked={settings.weather?.models?.icon !== false} onChange={(val) => updateNested('weather.models.icon', val)} />
                            </SettingItem>
                        </SettingCard>
                    </div>
                );

            case 'sources':
                return (
                    <div className="settings-tab-content">
                        <SectionTitle icon="📡" title="News Sources" />
                        <SettingCard>
                            <div className="settings-item" style={{
                                borderBottom: '1px solid var(--accent-danger)',
                                background: 'rgba(220, 38, 38, 0.15)',
                                padding: '10px'
                            }}>
                                <div className="settings-item__label" style={{ color: 'var(--accent-danger)' }}>
                                    <span>🏆 Top Websites Only</span>
                                    <small style={{ display: 'block', color: 'var(--text-muted)' }}>BBC, Reuters, NDTV, Hindu, TOI...</small>
                                </div>
                                <Toggle checked={settings.topWebsitesOnly === true} onChange={(val) => updateSettings({ ...settings, topWebsitesOnly: val })} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '10px' }}>
                                {Object.keys(settings.newsSources || {}).map(key => (
                                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={settings.newsSources?.[key] !== false}
                                            onChange={(e) => updateNested(`newsSources.${key}`, e.target.checked)}
                                            disabled={settings.topWebsitesOnly}
                                        />
                                        {key}
                                    </label>
                                ))}
                            </div>
                        </SettingCard>

                        <SectionTitle icon="🔗" title="Custom Feeds" />
                        <SettingCard>
                             <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                <input
                                    type="text"
                                    value={newFeedUrl}
                                    onChange={(e) => setNewFeedUrl(e.target.value)}
                                    placeholder="RSS URL..."
                                    className="settings-input"
                                />
                                <button className="btn btn--primary" onClick={handleAddFeed} disabled={isDiscovering}>
                                    {isDiscovering ? '...' : 'Add'}
                                </button>
                            </div>
                            {discoveryError && <div style={{color:'red', fontSize:'0.75rem'}}>{discoveryError}</div>}
                            {settings.customFeeds?.map((feed, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '5px 0' }}>
                                    <span>{feed.title || feed.url}</span>
                                    <button onClick={() => removeCustomFeed(i)} style={{color:'red'}}>✕</button>
                                </div>
                            ))}
                        </SettingCard>
                    </div>
                );

            case 'upahead':
                return (
                    <div className="settings-tab-content">
                        <SectionTitle icon="🗓️" title="Up Ahead Configuration" />
                        <SettingCard>
                            <div className="settings-item__label" style={{marginBottom:'10px'}}>Active Categories</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom:'15px' }}>
                                {['movies', 'events', 'festivals', 'alerts', 'sports', 'shopping', 'civic', 'weather_alerts'].map(cat => (
                                    <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', textTransform: 'capitalize' }}>
                                        <input
                                            type="checkbox"
                                            checked={settings.upAhead?.categories?.[cat] !== false}
                                            onChange={(e) => updateNested(`upAhead.categories.${cat}`, e.target.checked)}
                                        />
                                        {cat.replace('_', ' ')}
                                    </label>
                                ))}
                            </div>

                            <div className="settings-item__label" style={{marginBottom:'5px'}}>Locations</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom:'15px' }}>
                                {['Chennai', 'Muscat', 'Trichy'].map(loc => (
                                    <label key={loc} className={`chip-checkbox ${settings.upAhead?.locations?.includes(loc) ? 'active' : ''}`}>
                                        <input
                                            type="checkbox" style={{ display: 'none' }}
                                            checked={settings.upAhead?.locations?.includes(loc) || false}
                                            onChange={(e) => {
                                                const current = settings.upAhead?.locations || [];
                                                const next = e.target.checked ? [...current, loc] : current.filter(l => l !== loc);
                                                updateNested('upAhead.locations', next);
                                            }}
                                        />
                                        {loc}
                                    </label>
                                ))}
                            </div>
                        </SettingCard>

                        <SectionTitle icon="🏷️" title="Keywords Filtering" />
                        <SettingCard>
                            <KeywordInput
                                label="🎬 Movie Keywords (Positive)"
                                placeholder="e.g. ticket, release"
                                value={keywordInputs.movies}
                                onChange={(val) => setKeywordInputs({...keywordInputs, movies: val})}
                                onAdd={() => addKeyword('movies', keywordInputs.movies)}
                                items={settings.upAhead?.keywords?.movies || []}
                                onRemove={(w) => removeKeyword('movies', w)}
                            />
                            <KeywordInput
                                label="🎤 Event Keywords (Positive)"
                                placeholder="e.g. concert, standup"
                                value={keywordInputs.events}
                                onChange={(val) => setKeywordInputs({...keywordInputs, events: val})}
                                onAdd={() => addKeyword('events', keywordInputs.events)}
                                items={settings.upAhead?.keywords?.events || []}
                                onRemove={(w) => removeKeyword('events', w)}
                            />
                            <KeywordInput
                                label="🚫 Negative Keywords (Filter Out)"
                                placeholder="e.g. review, gossip"
                                value={keywordInputs.negative}
                                onChange={(val) => setKeywordInputs({...keywordInputs, negative: val})}
                                onAdd={() => addKeyword('negative', keywordInputs.negative)}
                                items={settings.upAhead?.keywords?.negative || []}
                                onRemove={(w) => removeKeyword('negative', w)}
                            />
                        </SettingCard>
                    </div>
                );

            case 'market':
                return (
                    <div className="settings-tab-content">
                        <SectionTitle icon="📈" title="Market Display" />
                        <SettingCard>
                            {Object.keys(settings.market || {}).filter(k => k.startsWith('show')).map(key => (
                                <SettingItem key={key} label={key.replace('show', '')}>
                                    <Toggle checked={settings.market?.[key] !== false} onChange={(val) => updateNested(`market.${key}`, val)} />
                                </SettingItem>
                            ))}
                        </SettingCard>
                    </div>
                );

            case 'advanced':
                return (
                    <div className="settings-tab-content">
                        <SectionTitle icon="🔧" title="Advanced" />
                        <SettingCard>
                            <SettingItem label="Enable News Cache" subLabel="Faster loads, 5min TTL">
                                <Toggle checked={settings.enableCache !== false} onChange={(val) => updateSettings({ ...settings, enableCache: val })} />
                            </SettingItem>
                            <SettingItem label="Crawler Mode">
                                <select value={settings.crawlerMode || 'auto'} onChange={(e) => updateSettings({ ...settings, crawlerMode: e.target.value })} className="settings-select">
                                    <option value="auto">Auto</option>
                                    <option value="manual">Manual</option>
                                </select>
                            </SettingItem>
                            <SettingItem label="Debug Logs">
                                <Toggle checked={settings.debugLogs === true} onChange={(val) => updateSettings({ ...settings, debugLogs: val })} />
                            </SettingItem>
                        </SettingCard>
                    </div>
                );

            case 'debug':
                return <DebugTab />;

            default: return null;
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            <Header title="Settings" showBack backTo="/" compact={true} style={{ flex: '0 0 auto' }} />
            <div className="settings-layout">
                {/* SIDEBAR TABS */}
                <div className="settings-sidebar">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`settings-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                            data-tooltip={tab.label}
                        >
                            <span className="tab-icon">{tab.icon}</span>
                            <span className="tab-label">{tab.label}</span>
                        </button>
                    ))}
                    {/* Buttons removed from sidebar */}
                </div>

                {/* CONTENT AREA */}
                <div className="settings-content">
                    <div className="settings-scroll-area">
                        {renderContent()}
                    </div>

                    <div className="settings-footer">
                        <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                            <button className="btn btn--danger" onClick={handleReset} style={{flex:1}}>
                                Reset
                            </button>
                            <button className="btn btn--primary" onClick={handleSave} style={{flex:1}}>
                                {saved ? '✓ Saved' : 'Save'}
                            </button>
                        </div>
                        <div className="version-tag">
                            {APP_VERSION}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .settings-layout {
                    display: flex;
                    flex: 1; /* Fill remaining space */
                    overflow: hidden; /* Prevent outer scroll */
                    background: var(--bg-primary);
                }
                .settings-sidebar {
                    width: 60px; /* Reduced width */
                    background: var(--bg-secondary);
                    border-right: 1px solid var(--border-default);
                    display: flex;
                    flex-direction: column;
                    padding: 10px 5px;
                    overflow-y: auto;
                    flex-shrink: 0;
                    scrollbar-width: none; /* Hide scrollbar Firefox */
                }
                .settings-sidebar::-webkit-scrollbar {
                    display: none; /* Hide scrollbar Chrome/Safari */
                }

                .settings-tab-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 12px 5px;
                    border: none;
                    background: transparent;
                    color: var(--text-secondary);
                    cursor: pointer;
                    border-radius: 8px;
                    margin-bottom: 5px;
                    transition: all 0.2s;
                    position: relative; /* For tooltip */
                }

                .settings-tab-btn.active {
                    background: var(--accent-primary);
                    color: #fff;
                }
                .tab-icon { font-size: 1.5rem; }

                .tab-label {
                    display: none;
                }

                /* Tooltip on Hover */
                .settings-tab-btn:hover::after {
                    content: attr(data-tooltip);
                    position: absolute;
                    left: 100%;
                    top: 50%;
                    transform: translateY(-50%);
                    background: rgba(0,0,0,0.8);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    white-space: nowrap;
                    z-index: 10;
                    margin-left: 10px;
                    pointer-events: none;
                }

                .settings-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .settings-scroll-area {
                    flex: 1;
                    overflow-y: auto;
                    padding: 15px;
                    padding-bottom: 20px;
                }

                .settings-footer {
                    flex-shrink: 0;
                    background: var(--bg-secondary);
                    border-top: 1px solid var(--border-default);
                    padding: 15px;
                    position: relative;
                    z-index: 10;
                    box-shadow: 0 -4px 12px rgba(0,0,0,0.2);
                }

                .version-tag {
                    text-align: right;
                    font-size: 0.7rem;
                    color: var(--text-muted);
                    margin-top: 8px;
                    font-family: monospace;
                    opacity: 0.7;
                }

                .settings-footer .btn {
                    padding: 12px;
                    font-size: 0.95rem;
                    font-weight: 600;
                }

                @media (min-width: 600px) {
                    .settings-scroll-area { padding: 30px; }
                }

                .settings-card {
                    background: var(--bg-card);
                    border-radius: var(--radius-md);
                    padding: 15px;
                    margin-bottom: 20px;
                    border: 1px solid var(--border-default);
                }
                .section-title {
                    font-size: 1.1rem;
                    font-weight: 600;
                    margin-bottom: 12px;
                    color: var(--text-primary);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .settings-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                .settings-item:last-child { border-bottom: none; }
                .settings-item__label span { display: block; font-weight: 500; font-size: 0.9rem; }
                .settings-item__label small { color: var(--text-muted); font-size: 0.75rem; }

                .settings-select, .settings-input, .settings-input-number {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-default);
                    color: var(--text-primary);
                    padding: 8px;
                    border-radius: 4px;
                    font-size: 0.85rem;
                }
                .settings-input { width: 100%; }

                .chip-checkbox {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    border-radius: 16px;
                    border: 1px solid var(--border-default);
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                    font-size: 0.8rem;
                    cursor: pointer;
                }
                .chip-checkbox.active {
                    background: var(--accent-primary);
                    color: #fff;
                    border-color: var(--accent-primary);
                }

                .keyword-chip {
                    display: inline-flex;
                    align-items: center;
                    padding: 4px 8px;
                    background: var(--bg-tertiary);
                    border-radius: 4px;
                    margin: 2px;
                    font-size: 0.75rem;
                }
                .keyword-chip button {
                    background: none;
                    border: none;
                    color: var(--accent-danger);
                    margin-left: 6px;
                    cursor: pointer;
                    padding: 0;
                }
            `}</style>
        </div>
    );
}

// Sub-components for cleaner render code
const SectionTitle = ({ icon, title }) => (
    <div className="section-title">
        <span>{icon}</span> {title}
    </div>
);

const SettingCard = ({ children }) => (
    <div className="settings-card">{children}</div>
);

const SettingItem = ({ label, subLabel, children }) => (
    <div className="settings-item">
        <div className="settings-item__label">
            <span>{label}</span>
            {subLabel && <small>{subLabel}</small>}
        </div>
        <div style={{ flex: '0 0 auto', marginLeft: '10px' }}>
            {children}
        </div>
    </div>
);

const KeywordInput = ({ label, placeholder, value, onChange, onAdd, items, onRemove }) => (
    <div style={{ marginBottom: '15px' }}>
        <div className="settings-item__label" style={{ marginBottom: '6px' }}>{label}</div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="settings-input"
                onKeyDown={(e) => e.key === 'Enter' && onAdd()}
            />
            <button className="btn btn--secondary" onClick={onAdd} style={{padding:'0 15px'}}>Add</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {items.map((item, i) => (
                <span key={i} className="keyword-chip">
                    {item}
                    <button onClick={() => onRemove(item)}>×</button>
                </span>
            ))}
            {items.length === 0 && <span style={{fontSize:'0.75rem', color:'var(--text-muted)'}}>No keywords set</span>}
        </div>
    </div>
);

// --- Debug Tab with logStore subscription ---
function DebugTab() {
    // Subscribe to logStore reactively
    const entries = useSyncExternalStore(
        logStore.subscribe,
        logStore.getEntries
    );
    const stats = logStore.getStats();
    const services = stats.byService;
    const sectionHealth = getAllSectionHealth();

    const levelColor = { info: '#88f', warn: '#fa0', error: '#f44', success: '#4f4' };

    return (
        <div className="settings-tab-content">
            <SectionTitle icon="🩺" title="Section Health" />
            <SettingCard>
                {Object.keys(sectionHealth).length === 0 ? (
                    <div style={{color:'var(--text-muted)', fontSize:'0.8rem'}}>No health data recorded yet.</div>
                ) : (
                    <table style={{width:'100%', fontSize:'0.75rem', borderCollapse:'collapse'}}>
                        <thead>
                            <tr style={{borderBottom:'1px solid var(--border-default)', color:'var(--text-muted)'}}>
                                <th style={{textAlign:'left', padding:'4px'}}>Section</th>
                                <th style={{textAlign:'center', padding:'4px'}}>History (3)</th>
                                <th style={{textAlign:'center', padding:'4px'}}>Avg</th>
                                <th style={{textAlign:'right', padding:'4px'}}>Health</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(sectionHealth).map(([section, history]) => {
                                const avg = history.length > 0 ? (history.reduce((a,b)=>a+b,0)/history.length).toFixed(1) : '-';
                                const last = history.length > 0 ? history[0] : 0;
                                const ratio = avg > 0 ? last / avg : 1;
                                let status = '🟢';
                                if (ratio < 0.1) status = '🔴';
                                else if (ratio < 0.5) status = '🟠';

                                return (
                                    <tr key={section} style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                                        <td style={{padding:'6px 4px', textTransform:'capitalize'}}>{section}</td>
                                        <td style={{textAlign:'center', padding:'6px 4px', color:'var(--text-muted)'}}>{history.join(', ')}</td>
                                        <td style={{textAlign:'center', padding:'6px 4px'}}>{avg}</td>
                                        <td style={{textAlign:'right', padding:'6px 4px'}}>{status}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </SettingCard>

            <SectionTitle icon="📊" title="Fetch Summary" />
            <SettingCard>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center', fontSize: '0.8rem' }}>
                    <div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{stats.totalFetches}</div>
                        <div style={{ color: 'var(--text-muted)' }}>Fetches</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#4f4' }}>{stats.successes}</div>
                        <div style={{ color: 'var(--text-muted)' }}>OK</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f44' }}>{stats.failures}</div>
                        <div style={{ color: 'var(--text-muted)' }}>Failed</div>
                    </div>
                </div>
            </SettingCard>

            <SectionTitle icon="🔌" title="Service Status" />
            <SettingCard>
                {Object.keys(services).length === 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '8px 0' }}>No data yet. Navigate other tabs to trigger fetches.</div>
                )}
                {Object.entries(services).map(([name, svc]) => (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: svc.lastStatus === 'ok' ? '#4f4' : '#f44', display: 'inline-block' }} />
                            <span style={{ fontWeight: 500 }}>{name}</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>
                            {svc.ok}/{svc.ok + svc.fail} &middot; {svc.totalMs > 0 ? `${Math.round(svc.totalMs / Math.max(svc.ok + svc.fail, 1))}ms avg` : '—'}
                        </div>
                    </div>
                ))}
            </SettingCard>

            <SectionTitle icon="📜" title="Live Log" />
            <div style={{
                background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px',
                fontFamily: 'monospace', fontSize: '11px', color: '#00ff41',
                height: '260px', overflowY: 'auto', padding: '10px',
                boxShadow: '0 0 20px rgba(0,255,65,0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '5px', marginBottom: '8px' }}>
                    <span>LOG ({entries.length} entries)</span>
                    <button onClick={() => logStore.clear()} style={{ background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '2px 8px', fontSize: '10px' }}>Clear</button>
                </div>
                {entries.length === 0 && <div style={{ color: '#555' }}>Waiting for activity...</div>}
                {entries.map((e, i) => (
                    <div key={i} style={{ marginBottom: '3px', color: levelColor[e.level] || '#ccc' }}>
                        <span style={{ color: '#555' }}>{new Date(e.ts).toLocaleTimeString()}</span>{' '}
                        <span style={{ color: '#888' }}>[{e.service}]</span>{' '}
                        {e.message}
                        {e.durationMs ? <span style={{ color: '#666' }}> ({e.durationMs}ms)</span> : ''}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default SettingsPage;
