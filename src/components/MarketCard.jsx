import React from 'react';

/**
 * Market Card Component
 * Displays:
 * - BSE/NSE indices
 * - Top gainers
 * - Top losers
 * - Market movers (if enabled)
 */
function MarketCard({
    marketData,
    settings = { showBSE: true, showNSE: true, showGainers: true, showLosers: true, showMovers: true }
}) {
    if (!marketData) {
        return (
            <section className="market-section">
                <h2 className="market-section__title">
                    <span>📈</span>
                    Market Overview
                </h2>
                <div className="empty-state">
                    <div className="empty-state__icon">📊</div>
                    <p>Market data not available</p>
                </div>
            </section>
        );
    }

    const { indices, gainers, losers, movers, sentiment } = marketData;

    return (
        <section className="market-section">
            <h2 className="market-section__title">
                <span>📈</span>
                Market Overview
            </h2>

            <div className="card">
                {/* Indices */}
                <div className="market-indices">
                    {settings.showBSE && indices.sensex && (
                        <div className="market-index">
                            <div className="market-index__name">{indices.sensex.name}</div>
                            <div className="market-index__value">
                                {indices.sensex.value.toLocaleString()}
                            </div>
                            <div className={`market-index__change market-index__change--${indices.sensex.direction}`}>
                                {indices.sensex.direction === 'up' ? '▲' : '▼'}
                                {' '}{Math.abs(indices.sensex.change)} ({indices.sensex.changePercent}%)
                            </div>
                        </div>
                    )}
                    {settings.showNSE && indices.nifty && (
                        <div className="market-index">
                            <div className="market-index__name">{indices.nifty.name}</div>
                            <div className="market-index__value">
                                {indices.nifty.value.toLocaleString()}
                            </div>
                            <div className={`market-index__change market-index__change--${indices.nifty.direction}`}>
                                {indices.nifty.direction === 'up' ? '▲' : '▼'}
                                {' '}{Math.abs(indices.nifty.change)} ({indices.nifty.changePercent}%)
                            </div>
                        </div>
                    )}
                </div>

                {/* Sentiment */}
                {sentiment && (
                    <div style={{
                        padding: 'var(--spacing-sm)',
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        borderBottom: '1px solid var(--border-default)',
                        marginBottom: 'var(--spacing-md)'
                    }}>
                        💹 {sentiment}
                    </div>
                )}

                {/* Gainers */}
                {settings.showGainers && (
                    <div className="market-movers">
                        <div className="market-movers__title market-movers__title--gainers">
                            🔼 Top Gainers {settings.showBSE && settings.showNSE ? '(BSE)' : settings.showBSE ? '(BSE)' : '(NSE)'}
                        </div>
                        {(settings.showBSE ? gainers.bse : gainers.nse)?.map((stock, idx) => (
                            <div key={idx} className="market-stock">
                                <div>
                                    <div className="market-stock__name">{stock.symbol}</div>
                                </div>
                                <div className="market-stock__price">₹{stock.price.toLocaleString()}</div>
                                <div className="market-stock__change text-success">
                                    ▲ {stock.changePercent}%
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Losers */}
                {settings.showLosers && (
                    <div className="market-movers" style={{ marginTop: 'var(--spacing-md)' }}>
                        <div className="market-movers__title market-movers__title--losers">
                            🔽 Top Losers {settings.showBSE && settings.showNSE ? '(BSE)' : settings.showBSE ? '(BSE)' : '(NSE)'}
                        </div>
                        {(settings.showBSE ? losers.bse : losers.nse)?.map((stock, idx) => (
                            <div key={idx} className="market-stock">
                                <div>
                                    <div className="market-stock__name">{stock.symbol}</div>
                                </div>
                                <div className="market-stock__price">₹{stock.price.toLocaleString()}</div>
                                <div className="market-stock__change text-danger">
                                    ▼ {Math.abs(stock.changePercent)}%
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Market Movers */}
                {settings.showMovers && movers && movers.length > 0 && (
                    <div className="market-movers" style={{ marginTop: 'var(--spacing-md)' }}>
                        <div className="market-movers__title" style={{ color: 'var(--accent-secondary)' }}>
                            📊 Market Movers
                        </div>
                        {movers.map((mover, idx) => (
                            <div key={idx} className="market-stock">
                                <div>
                                    <div className="market-stock__name">{mover.symbol}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                        Vol: {mover.volume}
                                    </div>
                                </div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--accent-primary)',
                                    fontWeight: 500
                                }}>
                                    {mover.action}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

export default MarketCard;
