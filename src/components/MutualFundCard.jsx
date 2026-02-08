import React, { useState } from 'react';

/**
 * Mutual Fund NAV Display Card
 * Shows popular fund NAVs with daily change
 */
function MutualFundCard({ funds }) {
    const [expanded, setExpanded] = useState(false);

    if (!funds || funds.length === 0) {
        return (
            <div className="mf-card mf-card--empty">
                <div className="mf-card__header">
                    <span>📊</span> Mutual Funds
                </div>
                <p className="mf-card__empty-text">NAV data unavailable</p>
            </div>
        );
    }

    const displayFunds = expanded ? funds : funds.slice(0, 4);

    return (
        <div className="mf-card">
            <div className="mf-card__header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📊</span> Mutual Fund NAVs
                </div>
                <span className="mf-card__date">
                    {funds[0]?.navDate || 'Latest'}
                </span>
            </div>

            <div className="mf-card__list">
                {displayFunds.map((fund, idx) => (
                    <div key={fund.code || idx} className="mf-fund">
                        <div className="mf-fund__info">
                            <div className="mf-fund__name">{fund.name}</div>
                            <div className="mf-fund__category">{fund.category}</div>
                        </div>
                        <div className="mf-fund__nav">
                            <div className="mf-fund__value">₹{fund.nav}</div>
                            <div className={`mf-fund__change mf-fund__change--${fund.direction}`}>
                                {fund.direction === 'up' ? '▲' : '▼'} {fund.changePercent}%
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {funds.length > 4 && (
                <button
                    className="mf-card__toggle"
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded ? 'Show Less ▲' : `Show All (${funds.length}) ▼`}
                </button>
            )}
        </div>
    );
}

export default MutualFundCard;
