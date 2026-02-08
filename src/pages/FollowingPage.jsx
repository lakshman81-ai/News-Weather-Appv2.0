import React, { useEffect } from 'react';
import { useTopics } from '../context/TopicContext.jsx';
import { TopicCard } from '../components/TopicCard.jsx';
import { TopicSearch } from '../components/TopicSearch.jsx';
import './FollowingPage.css';

export default function FollowingPage() {
    const {
        followedTopics,
        topicNews,
        loading,
        suggestions,
        addTopic,
        removeTopic,
        refreshTopics
    } = useTopics();

    useEffect(() => {
        // Trigger a silent refresh if needed, but context handles polling
    }, []);

    const hasTopics = followedTopics.length > 0;

    const handleSuggestionClick = (word) => {
        const newTopic = {
            name: word,
            query: word,
            icon: '🔍',
            options: { country: 'IN', lang: 'en', timeRange: '30d' }
        };
        addTopic(newTopic);
    };

    return (
        <div className="following-page">
            <header className="following-page__header">
                <h1>📌 Following</h1>
            </header>

            <div className="following-page__content">
                <TopicSearch onAddTopic={addTopic} />

                {suggestions.length > 0 && (
                    <div className="following-page__suggestions-section">
                        <h4>Suggested for you</h4>
                        <div className="following-page__suggestions">
                            {suggestions.map((s, i) => (
                                <button
                                    key={i}
                                    className="suggestion-chip"
                                    onClick={() => handleSuggestionClick(s.word)}
                                >
                                    + {s.word}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {loading && <p>Loading updates...</p>}

                {hasTopics ? (
                    <div className="following-page__topics">
                        <h2 className="following-page__section-title">Your Topics</h2>
                        {followedTopics.map(topic => (
                            <TopicCard
                                key={topic.id}
                                topic={topic}
                                articleCount={topicNews[topic.id]?.length || 0}
                                onRemove={removeTopic}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="following-page__empty">
                        <p>No topics followed yet.</p>
                        <p>Search for topics above to get started!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
