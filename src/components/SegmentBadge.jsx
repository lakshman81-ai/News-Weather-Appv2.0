import React from 'react';
import { formatSegmentTime } from '../utils/timeSegment';

/**
 * Segment Badge displaying current time segment
 */
function SegmentBadge({ segment }) {
    if (!segment) return null;

    return (
        <div className="segment-badge">
            <span>{segment.icon}</span>
            <span>{segment.name}</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                ({formatSegmentTime(segment)})
            </span>
        </div>
    );
}

export default SegmentBadge;
