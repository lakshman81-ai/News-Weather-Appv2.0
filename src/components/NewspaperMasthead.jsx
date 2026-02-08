import React from 'react';
import { getCurrentSegment } from '../utils/timeSegment';
import './NewspaperMasthead.css';

export function NewspaperMasthead({ breakingNews }) {
    const segment = getCurrentSegment();
    const today = new Date();

    return (
        <div className="newspaper-masthead">
            <div className="masthead__header">
                <div className="masthead__title">
                    <h1 className="masthead__logo">Daily News AI</h1>
                    <div className="masthead__tagline">Your Intelligent News Digest</div>
                </div>
                <div className="masthead__meta">
                    <div className="masthead__date">
                        {today.toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </div>
                    <div className="masthead__segment">{segment.name}</div>
                </div>
            </div>

            {/* Breaking News Banner */}
            {breakingNews?.length > 0 && (
                <div className="masthead__breaking">
                    <span className="breaking-badge">BREAKING</span>
                    <span className="breaking-text">{breakingNews[0].title}</span>
                </div>
            )}
        </div>
    );
}
