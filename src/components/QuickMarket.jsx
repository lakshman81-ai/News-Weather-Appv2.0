import React from 'react';
import { useMarket } from '../context/MarketContext';
import './QuickMarket.css';

/**
 * Quick Market Widget
 * Summarizes key indices (Nifty/Sensex) and market trend.
 * Designed to look like the QuickWeather widget.
 */
const QuickMarket = () => {
    const { marketData, loading } = useMarket();

    if (loading && (!marketData || !marketData.indices)) {
        return (
            <div className="quick-market">
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Loading Markets...</div>
            </div>
        );
    }

    if (!marketData || !marketData.indices || marketData.indices.length === 0) {
        return null;
    }

    // Extract Nifty 50 and Sensex
    // Fallback to first two indices if specific ones aren't found
    const nifty = marketData.indices.find(i => i.name.toUpperCase().includes('NIFTY') && i.name.includes('50')) || marketData.indices[0];
    const sensex = marketData.indices.find(i => i.name.toUpperCase().includes('SENSEX')) || marketData.indices[1];

    if (!nifty || !sensex) return null;

    // Determine Market Status (Simple Time Check)
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Market Hours: Mon-Fri, 09:15 - 15:30
    const isWeekend = day === 0 || day === 6;
    const timeInMinutes = hour * 60 + minute;
    const marketOpen = 9 * 60 + 15;
    const marketClose = 15 * 60 + 30;

    const isOpen = !isWeekend && timeInMinutes >= marketOpen && timeInMinutes <= marketClose;

    const statusText = isOpen ? 'Live' : 'Closed';
    const statusClass = isOpen ? 'qm-status--open' : 'qm-status--closed';

    // Trend Analysis
    const niftyChange = parseFloat(nifty.change);
    const sensexChange = parseFloat(sensex.change);

    const isBullish = niftyChange > 0 && sensexChange > 0;
    const isBearish = niftyChange < 0 && sensexChange < 0;

    let trendText = "Global cues are mixed; proceed with caution.";
    let trendIcon = "⚖️";

    if (isBullish) {
        if (parseFloat(nifty.changePercent) > 1.0) {
            trendText = "Strong bullish momentum across major indices.";
            trendIcon = "🚀";
        } else {
            trendText = "Markets are trading in the green.";
            trendIcon = "📈";
        }
    } else if (isBearish) {
        if (parseFloat(nifty.changePercent) < -1.0) {
            trendText = "Heavy selling pressure observed today.";
            trendIcon = "📉";
        } else {
            trendText = "Indices are under pressure.";
            trendIcon = "🔻";
        }
    }

    return (
        <section className="quick-market">
            <div className="qm-header">
                <div style={{ fontWeight: 600, color: 'var(--accent-success)' }}>
                    Market Pulse
                </div>
                <div className={`qm-status ${statusClass}`}>
                    {statusText} • {now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
            </div>

            <div className="qm-body">
                <div className="qm-index">
                    <span className="qm-index-name">{nifty.name}</span>
                    <span className="qm-index-value">{nifty.value}</span>
                    <span className="qm-index-change" style={{ color: niftyChange >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                        {niftyChange >= 0 ? '▲' : '▼'} {Math.abs(niftyChange).toFixed(2)} ({nifty.changePercent}%)
                    </span>
                </div>
                <div className="qm-index" style={{ alignItems: 'flex-end', textAlign: 'right' }}>
                    <span className="qm-index-name">{sensex.name}</span>
                    <span className="qm-index-value">{sensex.value}</span>
                    <span className="qm-index-change" style={{ color: sensexChange >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                        {sensexChange >= 0 ? '▲' : '▼'} {Math.abs(sensexChange).toFixed(2)} ({sensex.changePercent}%)
                    </span>
                </div>
            </div>

            <div className="qm-summary">
                <span className="qm-trend-icon">{trendIcon}</span>
                {trendText}
            </div>
        </section>
    );
};

export default QuickMarket;
