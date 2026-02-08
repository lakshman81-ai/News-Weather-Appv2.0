import React from 'react';
import { useNavigate } from 'react-router-dom';
import './TopicCard.css';

export function TopicCard({ topic, articleCount, onClick, onRemove }) {
    const navigate = useNavigate();

    // Check if we need to show time ago
    const timeAgo = topic.lastFetched
        ? getRelativeTime(new Date(topic.lastFetched))
        : 'Never updated';

    const handleClick = () => {
        // If onClick prop is passed, use it, otherwise navigate
        if (onClick) {
            onClick(topic);
        } else {
            navigate(`/following/${topic.id}`);
        }
    };

    return (
        <div className="topic-card" onClick={handleClick}>
            <div className="topic-card__icon">{topic.icon || '📰'}</div>
            <div className="topic-card__content">
                <h3 className="topic-card__name">{topic.name}</h3>
                <p className="topic-card__update">Last update: {timeAgo}</p>
            </div>
            <div className="topic-card__badge">
                {articleCount > 0 && (
                    <span className="topic-card__count">{articleCount} new</span>
                )}
            </div>
            <button
                className="topic-card__menu"
                onClick={(e) => {
                    e.stopPropagation();
                    // Confirm? Maybe not, just remove.
                    if (window.confirm(`Stop following "${topic.name}"?`)) {
                        onRemove(topic.id);
                    }
                }}
                aria-label="Remove topic"
            >
                ⋮
            </button>
        </div>
    );
}

function getRelativeTime(date) {
    if (!date) return 'Never';
    const mins = Math.floor((Date.now() - date) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${Math.floor(hours / 24)} days ago`;
}
