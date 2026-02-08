import React, { useState } from 'react';
import { getCredibilityStars } from '../data/sourceMetrics';
import { addReadArticle } from '../utils/storage';
import { useNews } from '../context/NewsContext';

/**
 * News Section Component
 * Displays news items for a specific region (World/India/Chennai/Trichy/Local/Entertainment)
 * Features:
 * - Clickable headlines open story URL
 * - Critics/public view shown where applicable
 * - Source count displayed
 * - Collapsible header
 */
function NewsSection({
    id,
    title,
    icon,
    colorClass,
    news = [],
    maxDisplay = 3,
    showExpand = true,
    error = null,
    extraContent = null,
    onArticleClick = null,
    showCritics = true
}) {
    const [expanded, setExpanded] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { auditResults } = useNews();

    const displayCount = expanded ? news.length : Math.min(maxDisplay, news.length);
    const displayNews = news.slice(0, displayCount);
    const hasMore = news.length > maxDisplay;

    // --- Section Health Badges ---
    const health = news.health || { status: 'ok' };
    const isSingleSource = news.isSingleSource;

    const getConfidenceClass = (confidence) => {
        switch (confidence?.toUpperCase()) {
            case 'HIGH': return 'news-item__confidence--high';
            case 'MEDIUM': return 'news-item__confidence--medium';
            case 'LOW': return 'news-item__confidence--low';
            default: return '';
        }
    };

    const getTimeAgo = (timestamp) => {
        if (!timestamp) return '';
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return "Just now";
    };

    const handleStoryClick = (item) => {
        // Track history
        addReadArticle(item);

        // External handler
        if (onArticleClick) {
            onArticleClick(item);
        }

        if (item.url) {
            window.open(item.url, '_blank', 'noopener,noreferrer');
        }
    };

    const renderContent = () => {
        if (error) {
            return (
                <div className="empty-state" style={{ borderColor: 'rgba(255, 87, 87, 0.3)' }}>
                    <div className="empty-state__icon">❌</div>
                    <p style={{ color: '#ff5757' }}>{error}</p>
                </div>
            );
        }

        if (news.length === 0) {
            return (
                <div className="empty-state">
                    <div className="empty-state__icon">📭</div>
                    <p>No news available for this section</p>
                </div>
            );
        }

        return (
            <>
                {extraContent}
                <div className="news-list">
                    {displayNews.map((item, idx) => (
                        <article
                            key={item.id || idx}
                            className="news-item"
                            onClick={() => handleStoryClick(item)}
                            style={{ cursor: item.url ? 'pointer' : 'default' }}
                        >
                            <h3 className="news-item__headline">
                                • {item.headline}

                                {/* Audit Badges */}
                                {auditResults[item.id] && (
                                    <span className="audit-badges" style={{ marginLeft: '8px', fontSize: '0.8em' }}>
                                        {auditResults[item.id].consensus?.badge && (
                                            <span title={`Corroborated by ${auditResults[item.id].consensus.count} sources`} style={{ marginRight: '4px' }}>
                                                {auditResults[item.id].consensus.badge}
                                            </span>
                                        )}
                                        {auditResults[item.id].persistenceBadge && (
                                            <span title="Persisted from previous fetch" style={{ marginRight: '4px' }}>
                                                {auditResults[item.id].persistenceBadge}
                                            </span>
                                        )}
                                        {auditResults[item.id].relevance?.badge && (
                                            <span title="Matches your filters" style={{ marginRight: '4px' }}>
                                                {auditResults[item.id].relevance.badge}
                                            </span>
                                        )}
                                        {auditResults[item.id].anomaly?.badge && (
                                            <span title={`Anomaly: ${auditResults[item.id].anomaly.type}`} style={{ marginRight: '4px' }}>
                                                {auditResults[item.id].anomaly.badge}
                                            </span>
                                        )}
                                        {auditResults[item.id].breakingVerified && (
                                            <span title={auditResults[item.id].breakingVerified === '✅' ? 'Breaking Verified' : 'Unverified Source'} style={{ marginRight: '4px' }}>
                                                {auditResults[item.id].breakingVerified}
                                            </span>
                                        )}
                                    </span>
                                )}

                                {item.url && (
                                    <span style={{
                                        fontSize: '0.7rem',
                                        marginLeft: '8px',
                                        color: 'var(--accent-secondary)'
                                    }}>↗</span>
                                )}
                                {/* Context Badge (Phase 9) */}
                                {item.impactScore > 10 && (
                                    <span style={{
                                        fontSize: '0.6rem',
                                        marginLeft: '8px',
                                        padding: '2px 4px',
                                        borderRadius: '4px',
                                        background: 'var(--accent-primary)',
                                        color: '#fff',
                                        verticalAlign: 'middle'
                                    }}>
                                        {item.isBreaking ? '⚡ Breaking' : '🔥 Trending'}
                                    </span>
                                )}
                            </h3>
                            {item.summary && (
                                <p className="news-item__summary">
                                    {item.summary}
                                </p>
                            )}
                            {showCritics && item.criticsView && (
                                <div className="news-item__critics">
                                    <span>💬</span>
                                    <div>
                                        <strong style={{ color: 'var(--accent-secondary)', display: 'block', marginBottom: '2px' }}>Critics Take:</strong>
                                        {item.criticsView}
                                    </div>
                                </div>
                            )}
                            <div className="news-item__meta">
                                {item.sentiment && (
                                    <span
                                        className={`sentiment-badge sentiment--${item.sentiment.label}`}
                                        title={`Sentiment: ${item.sentiment.label}`}
                                    >
                                        {item.sentiment.label === 'positive' ? '🟢' :
                                            item.sentiment.label === 'negative' ? '🔴' : '⚪'}
                                    </span>
                                )}
                                <span className="news-item__source">{item.source}</span>
                                {item.sourceCount > 1 && (
                                    <span
                                        className="news-item__consensus"
                                        title={`Reported by ${item.sourceCount} sources`}
                                    >
                                        🔔 {item.sourceCount} sources
                                    </span>
                                )}
                                <span>|</span>
                                <span>{getTimeAgo(item.publishedAt) || item.time}</span>
                                {item.sourceCount && (
                                    <>
                                        <span>|</span>
                                        <span>#{item.sourceCount} Sources</span>
                                    </>
                                )}
                                <span>|</span>
                                <span className={`news-item__confidence ${getConfidenceClass(item.confidence)}`}>
                                    {item.confidence}
                                </span>
                            </div>
                        </article>
                    ))}
                </div>

                {showExpand && hasMore && (
                    <div
                        className="news-more"
                        onClick={() => setExpanded(!expanded)}
                    >
                        <span style={{ fontSize: '1.2rem' }}>{expanded ? '▲' : '▼'}</span>
                        <span>{expanded ? 'Collapse' : `See ${news.length - maxDisplay} more stories`}</span>
                    </div>
                )}
            </>
        );
    };

    return (
        <section className="news-section" id={id}>
            <h2
                className={`news-section__title ${colorClass}`}
                onClick={() => setIsCollapsed(!isCollapsed)}
                style={{ cursor: 'pointer' }}
                title={`Tap to fold/unfold. Health: ${health.status.toUpperCase()}`}
            >
                <span>{icon}</span>
                {title}

                {/* Health Indicators */}
                {health.status === 'critical' && <span title="Critical: Feed yield < 10% of average" style={{ marginLeft: '8px' }}>🔴</span>}
                {health.status === 'warning' && <span title="Warning: Feed yield < 50% of average" style={{ marginLeft: '8px' }}>⚠️</span>}
                {isSingleSource && news.length > 3 && <span title="Single Source: Potential echo chamber" style={{ marginLeft: '8px' }}>📡</span>}

                {news.length > 0 && (
                    <span style={{ opacity: 0.6, fontSize: '0.9em', marginLeft: '6px' }}>({news.length})</span>
                )}

                {/* Collapse Indicator */}
                <span style={{ marginLeft: '8px', fontSize: '0.8em', opacity: 0.5 }}>
                    {isCollapsed ? '▼' : '▲'}
                </span>

                {/* Data Age Badge */}
                {news.length > 0 && news[0].fetchedAt && (
                    <span style={{
                        fontSize: '0.65rem',
                        marginLeft: 'auto',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: (Date.now() - news[0].fetchedAt) < 3600000 ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 165, 0, 0.2)',
                        color: (Date.now() - news[0].fetchedAt) < 3600000 ? '#4caf50' : '#ffa726',
                        border: '1px solid currentColor',
                        fontWeight: 'normal'
                    }}>
                        {(Date.now() - news[0].fetchedAt) < 300000 ? 'LIVE' : getTimeAgo(news[0].fetchedAt)}
                    </span>
                )}
            </h2>

            {!isCollapsed && renderContent()}
        </section>
    );
}

export default NewsSection;
