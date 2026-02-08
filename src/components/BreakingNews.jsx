import React, { useState, useEffect } from 'react';
import './BreakingNews.css';

const BreakingNews = ({ items }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Rotate messages if multiple breaking stories
    useEffect(() => {
        if (!items || items.length < 2) return;

        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % items.length);
        }, 5000); // 5 seconds per story

        return () => clearInterval(interval);
    }, [items]);

    if (!items || items.length === 0) return null;

    const currentItem = items[currentIndex];

    return (
        <div className="breaking-news-banner">
            <div className="breaking-label">
                <span className="pulse-icon">🔴</span> BREAKING
            </div>
            <div className="breaking-content">
                <a href={currentItem.link} target="_blank" rel="noopener noreferrer" className="breaking-link">
                    {currentItem.title}
                </a>
                <span className="breaking-time">
                    {currentItem.time} • {currentItem.source}
                </span>
            </div>
            {items.length > 1 && (
                <div className="breaking-controls">
                    {items.map((_, idx) => (
                        <span
                            key={idx}
                            className={`control-dot ${idx === currentIndex ? 'active' : ''}`}
                            onClick={() => setCurrentIndex(idx)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default BreakingNews;
