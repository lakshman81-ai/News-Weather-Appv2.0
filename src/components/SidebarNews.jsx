import React from 'react';
import { FaExternalLinkAlt } from 'react-icons/fa';

/**
 * SidebarNews Component
 * Displays a compact vertical list of news, styled like a newspaper column.
 * Intended for the desktop sidebar.
 */
const SidebarNews = ({ news = [], title = "Global Headlines" }) => {
    if (!news || news.length === 0) return null;

    // Show top 10 items
    const displayNews = news.slice(0, 10);

    return (
        <div className="card" style={{ padding: 'var(--spacing-md)', background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
            <h3 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.2rem',
                marginBottom: 'var(--spacing-md)',
                paddingBottom: 'var(--spacing-sm)',
                borderBottom: '2px solid var(--accent-primary)',
                color: 'var(--text-primary)'
            }}>
                {title}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {displayNews.map((item, index) => (
                    <article key={index} style={{ paddingBottom: 'var(--spacing-sm)', borderBottom: '1px solid var(--border-default)' }}>
                        <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                        >
                            <h4 style={{
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                lineHeight: '1.4',
                                marginBottom: '4px',
                                color: 'var(--text-primary)'
                            }}>
                                {item.headline || item.title}
                            </h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                <span>{item.source}</span>
                                <span>{item.time || new Date(item.publishedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                        </a>
                    </article>
                ))}
            </div>

            <div style={{ marginTop: 'var(--spacing-md)', textAlign: 'center', fontSize: '0.8rem', color: 'var(--accent-secondary)' }}>
                Top Stories
            </div>
        </div>
    );
};

export default SidebarNews;
