import React, { useState } from 'react';
import { buildTopicQuery } from '../utils/topicQueryBuilder.js';
import { fetchAndParseFeed } from '../services/rssAggregator.js';
import './TopicSearch.css';

export function TopicSearch({ onAddTopic }) {
    const [query, setQuery] = useState('');
    const [previewArticles, setPreviewArticles] = useState([]);
    const [searching, setSearching] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setSearching(true);
        try {
            // Use 'preview' context or just generic RSS fetch
            const feedUrl = buildTopicQuery(query);
            const articles = await fetchAndParseFeed(feedUrl, 'preview');
            setPreviewArticles(articles.slice(0, 5)); // Show top 5
        } catch (error) {
            console.error('Search failed:', error);
            alert('Failed to find news for this topic. Try different keywords.');
        } finally {
            setSearching(false);
        }
    };

    const handleFollow = () => {
        const newTopic = {
            name: query, // User can edit name? Simplify for now.
            query: query,
            icon: suggestIcon(query),
            options: {
                country: 'IN',
                lang: 'en',
                timeRange: '30d'
            }
        };

        onAddTopic(newTopic);
        setQuery('');
        setPreviewArticles([]);
    };

    return (
        <div className="topic-search">
            <form onSubmit={handleSearch}>
                <input
                    type="text"
                    placeholder="Search topics... (e.g., Tamil Nadu Elections)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="topic-search__input"
                />
                <button type="submit" disabled={searching}>
                    {searching ? '...' : 'Search'}
                </button>
            </form>

            {previewArticles.length > 0 && (
                <div className="topic-search__preview">
                    <h4>Preview: "{query}"</h4>
                    <ul>
                        {previewArticles.map((article, idx) => (
                            <li key={idx}>{article.title}</li>
                        ))}
                    </ul>
                    <button onClick={handleFollow} className="topic-search__follow-btn">
                        ➕ Follow "{query}"
                    </button>
                </div>
            )}
        </div>
    );
}

function suggestIcon(query) {
    const q = query.toLowerCase();
    if (q.includes('election')) return '🗳️';
    if (q.includes('market') || q.includes('stock') || q.includes('sensex')) return '📊';
    if (q.includes('film') || q.includes('movie') || q.includes('cinema')) return '🎬';
    if (q.includes('sport') || q.includes('cricket') || q.includes('ipl')) return '🏏';
    if (q.includes('tech') || /\bai\b/.test(q) || q.includes('startup')) return '💻';
    if (q.includes('weather') || q.includes('rain')) return '☁️';
    return '📰';
}
