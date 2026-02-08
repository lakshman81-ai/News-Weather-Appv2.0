import React from 'react';
import './LoadingSkeleton.css';

/**
 * Skeleton for individual news item
 * Shows animated placeholders while loading
 */
export function NewsItemSkeleton() {
    return (
        <div className="news-item news-item--skeleton" aria-busy="true" aria-label="Loading news item">
            <div className="skeleton skeleton--title"></div>
            <div className="skeleton skeleton--subtitle"></div>
            <div className="skeleton skeleton--meta"></div>
        </div>
    );
}

/**
 * Skeleton for entire news section
 * @param {number} count - Number of skeleton items to show
 */
export function NewsSectionSkeleton({ count = 3 }) {
    return (
        <div className="news-section news-section--skeleton">
            {Array.from({ length: count }).map((_, i) => (
                <NewsItemSkeleton key={`skeleton-${i}`} />
            ))}
        </div>
    );
}
