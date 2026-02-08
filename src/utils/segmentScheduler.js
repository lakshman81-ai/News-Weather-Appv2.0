/**
 * Logic engine for the Time Segment Scheduler.
 * Maps current time to specific content modes.
 */

export const SEGMENTS = [
    { start: '06:55', id: 'morning_weather', label: 'Morning Weather', name: 'Morning Weather', icon: '🌤️', focus: 'weather' },
    { start: '07:00', id: 'morning_news', label: 'Morning News', name: 'Morning News', icon: '☕', focus: 'news_top' },
    { start: '09:00', id: 'market_brief', label: 'Market Brief', name: 'Market Brief', icon: '📈', focus: 'market' },
    { start: '11:55', id: 'midday_brief', label: 'Midday Brief', name: 'Midday Brief', icon: '☀️', focus: 'news_all' },
    { start: '14:30', id: 'market_movers', label: 'Market Movers', name: 'Market Movers', icon: '📉', focus: 'market' },
    { start: '16:20', id: 'evening_news', label: 'Evening News', name: 'Evening News', icon: '🌆', focus: 'news_all' },
    { start: '16:45', id: 'local_events', label: 'Local Events', name: 'Local Events', icon: '📍', focus: 'local' },
    { start: '19:30', id: 'night_wrap', label: 'Night Wrap-Up', name: 'Night Wrap-Up', icon: '🌙', focus: 'summary' },
    { start: '20:00', id: 'urgent_only', label: 'Urgent Alerts Only', name: 'Urgent Alerts Only', icon: '⚠️', focus: 'breaking' }
];

/**
 * Returns the current active segment definition.
 */
export function getCurrentSegmentDefinition() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Default to the last segment of the previous day (Urgent Only) if before first segment
    let activeSegment = SEGMENTS[SEGMENTS.length - 1];

    for (let i = 0; i < SEGMENTS.length; i++) {
        const seg = SEGMENTS[i];
        const [h, m] = seg.start.split(':').map(Number);
        const segMinutes = h * 60 + m;

        if (currentMinutes >= segMinutes) {
            activeSegment = seg;
        } else {
            // optimized: segments are sorted, so once we exceed current time, previous was the one
            break;
        }
    }
    return activeSegment;
}

/**
 * Returns milliseconds until the next segment starts.
 */
export function getTimeUntilNextSegment() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Find next segment
    let nextSegment = null;
    for (const seg of SEGMENTS) {
        const [h, m] = seg.start.split(':').map(Number);
        const segMinutes = h * 60 + m;
        if (segMinutes > currentMinutes) {
            nextSegment = seg;
            break;
        }
    }

    let targetTime = new Date(now);

    if (nextSegment) {
        const [h, m] = nextSegment.start.split(':').map(Number);
        targetTime.setHours(h, m, 0, 0);
    } else {
        // Next segment is tomorrow morning (first segment)
        const [h, m] = SEGMENTS[0].start.split(':').map(Number);
        targetTime.setDate(targetTime.getDate() + 1);
        targetTime.setHours(h, m, 0, 0);
    }

    return Math.max(0, targetTime.getTime() - now.getTime());
}

/**
 * Check if we just crossed a segment boundary.
 * Useful for polling checks.
 * @param {Date} lastCheckTime
 */
export function checkForSegmentChange(lastCheckTime) {
    if (!lastCheckTime) return getCurrentSegmentDefinition();

    const now = new Date();
    const prevSegment = getSegmentForTime(lastCheckTime);
    const currSegment = getCurrentSegmentDefinition();

    if (prevSegment.id !== currSegment.id) {
        return currSegment;
    }
    return null;
}

function getSegmentForTime(date) {
    const currentMinutes = date.getHours() * 60 + date.getMinutes();
    let activeSegment = SEGMENTS[SEGMENTS.length - 1];

    for (let i = 0; i < SEGMENTS.length; i++) {
        const seg = SEGMENTS[i];
        const [h, m] = seg.start.split(':').map(Number);
        const segMinutes = h * 60 + m;

        if (currentMinutes >= segMinutes) {
            activeSegment = seg;
        } else {
            break;
        }
    }
    return activeSegment;
}
