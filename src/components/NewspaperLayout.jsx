import React from 'react';
import { NewspaperMasthead } from './NewspaperMasthead';
import { ImageCard } from './ImageCard';
import { useSettings } from '../context/SettingsContext';
import './NewspaperLayout.css';

export function NewspaperLayout({ newsData, breakingNews, settings }) {
    const { settings: globalSettings } = useSettings();

    // Get all articles and filter ones with images
    // Filter by enabled sections first AND limit by count
    const rawArticles = Object.entries(newsData)
        .filter(([key, _]) => key !== 'frontPage' && globalSettings?.sections?.[key]?.enabled !== false)
        .map(([key, articles]) => {
            const limit = globalSettings?.sections?.[key]?.count;
            return (typeof limit === 'number') ? articles.slice(0, limit) : articles;
        })
        .flat();

    // Integrate Balanced Front Page if available
    let allArticles = rawArticles;
    if (newsData.frontPage && Array.isArray(newsData.frontPage)) {
        // Prioritize Front Page items at the top
        // Deduplicate based on title (or ID if available) to avoid showing same story twice
        const frontPageTitles = new Set(newsData.frontPage.map(a => a.title));
        const filteredRaw = rawArticles.filter(a => !frontPageTitles.has(a.title));
        allArticles = [...newsData.frontPage, ...filteredRaw];
    }

    const articlesWithImages = allArticles.filter(article => article.imageUrl);
    const articlesWithoutImages = allArticles.filter(article => !article.imageUrl);

    // Headlines: Top 3 articles with images
    const headlines = articlesWithImages.slice(0, settings?.headlinesCount || 3);

    // Leads: Next 6 articles with images
    const leads = articlesWithImages.slice(3, 3 + (settings?.leadsCount || 6));

    // Briefs: Articles without images
    const briefs = articlesWithoutImages.slice(0, settings?.briefsCount || 12);

    return (
        <div className="newspaper-layout">
            <NewspaperMasthead breakingNews={breakingNews} />

            {/* Headlines Zone - Above the Fold */}
            {headlines.length > 0 && (
                <section className="headlines-zone">
                    <h2 className="zone-title">📰 Top Stories</h2>
                    <div className="headlines-grid">
                        {headlines[0] && (
                            <div className="headline-lead">
                                <ImageCard
                                    article={headlines[0]}
                                    size="large"
                                    onClick={() => window.open(headlines[0].link, '_blank')}
                                />
                            </div>
                        )}
                        {headlines.length > 1 && (
                            <div className="headline-supporting">
                                {headlines.slice(1).map(article => (
                                    <ImageCard
                                        key={article.id}
                                        article={article}
                                        size="medium"
                                        onClick={() => window.open(article.link, '_blank')}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Section Leads - Horizontal Scroll */}
            {leads.length > 0 && (
                <section className="leads-zone">
                    <h2 className="zone-title">🌍 More From Today</h2>
                    <div className="leads-scroll">
                        {leads.map(article => (
                            <ImageCard
                                key={article.id}
                                article={article}
                                size="medium"
                                onClick={() => window.open(article.link, '_blank')}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Briefs Section - Text Only */}
            {briefs.length > 0 && (
                <section className="briefs-zone">
                    <h2 className="zone-title">📋 News Briefs</h2>
                    <div className="briefs-list">
                        {briefs.map(article => (
                            <article
                                key={article.id}
                                className="brief-item"
                                onClick={() => window.open(article.link, '_blank')}
                            >
                                <h4 className="brief-title">{article.title}</h4>
                                <div className="brief-meta">
                                    <span className="brief-source">{article.source}</span>
                                    <span className="brief-time">{article.time}</span>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
