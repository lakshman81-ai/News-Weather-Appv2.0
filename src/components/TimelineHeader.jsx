import React from 'react';
import MarketTicker from './MarketTicker';

/**
 * Timeline Header
 * Displays the Current Segment info as the title.
 */
const TimelineHeader = ({ title, icon, actions }) => {
    // User requested to remove "Market Brief" text when ticker is present
    const showTitle = title !== 'Market Brief';

    return (
        <header className="header timeline-header">
            {showTitle && (
                <h1 className="header__title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                    <span>{title}</span>
                </h1>
            )}

            <MarketTicker />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {actions}
            </div>
        </header>
    );
};

export default TimelineHeader;
