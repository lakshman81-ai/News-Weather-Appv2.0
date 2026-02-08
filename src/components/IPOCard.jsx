import React, { useState } from 'react';

/**
 * IPO Listings Card
 * Shows upcoming, live, and recent IPOs
 */
function IPOCard({ ipoData }) {
    const [activeTab, setActiveTab] = useState('upcoming');

    if (!ipoData) {
        return (
            <div className="ipo-card ipo-card--empty">
                <div className="ipo-card__header">
                    <span>🎯</span> IPO Tracker
                </div>
                <p>IPO data unavailable</p>
            </div>
        );
    }

    const tabs = [
        { key: 'upcoming', label: 'Upcoming', icon: '📅' },
        { key: 'live', label: 'Live', icon: '🔴' },
        { key: 'recent', label: 'Recent', icon: '✅' }
    ];

    const currentList = ipoData[activeTab] || [];

    return (
        <div className="ipo-card">
            <div className="ipo-card__header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🎯</span> IPO Tracker
                </div>
                {ipoData.isFallback && (
                    <span className="ipo-card__fallback-badge">Demo Data</span>
                )}
            </div>

            <div className="ipo-card__tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        className={`ipo-tab ${activeTab === tab.key ? 'ipo-tab--active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.icon} {tab.label}
                        <span className="ipo-tab__count">{ipoData[tab.key]?.length || 0}</span>
                    </button>
                ))}
            </div>

            <div className="ipo-card__list">
                {currentList.length === 0 ? (
                    <div className="ipo-card__empty">
                        No {activeTab} IPOs at the moment
                    </div>
                ) : (
                    currentList.map((ipo, idx) => (
                        <div key={idx} className="ipo-item">
                            <div className="ipo-item__header">
                                <div className="ipo-item__name">
                                    {ipo.name}
                                    {ipo.isSME && <span style={{fontSize:'0.6rem', marginLeft:'6px', background:'#333', padding:'2px 4px', borderRadius:'4px'}}>SME</span>}
                                </div>
                                <div className={`ipo-item__status ipo-item__status--${ipo.status || activeTab}`}>
                                    {ipo.status || activeTab}
                                </div>
                            </div>
                            <div className="ipo-item__details">
                                {ipo.issuePrice && (
                                    <div className="ipo-item__detail">
                                        <span className="ipo-item__label">Price Band:</span>
                                        <span className="ipo-item__value">{ipo.issuePrice}</span>
                                    </div>
                                )}
                                <div className="ipo-item__detail">
                                    <span className="ipo-item__label">Open:</span>
                                    <span className="ipo-item__value">{ipo.openDate}</span>
                                </div>
                                <div className="ipo-item__detail">
                                    <span className="ipo-item__label">Close:</span>
                                    <span className="ipo-item__value">{ipo.closeDate}</span>
                                </div>
                                {ipo.issueSize && ipo.issueSize !== '-' && (
                                    <div className="ipo-item__detail">
                                        <span className="ipo-item__label">Size:</span>
                                        <span className="ipo-item__value">{ipo.issueSize}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default IPOCard;
