// Time Segment Logic based on Daily Event AI V3.3 Specification
// Segments are based on local time

export const SEGMENTS = {
    MORNING_WEATHER: {
        id: 'morning_weather',
        name: 'Morning Weather',
        icon: '🌅',
        startHour: 6,
        startMinute: 55,
        endHour: 7,
        endMinute: 0,
        sections: ['weather'],
        recommended: {
            world: true,
            india: true,
            chennai: true,
            trichy: true,
            local: true,
            social: false,
            weather: true,
            market: false
        }
    },
    MORNING_NEWS: {
        id: 'morning_news',
        name: 'Morning News',
        icon: '🌄',
        startHour: 7,
        startMinute: 0,
        endHour: 9,
        endMinute: 0,
        sections: ['weather', 'world', 'india', 'chennai', 'trichy', 'local', 'dtNext'],
        recommended: {
            world: true,
            india: true,
            chennai: true,
            trichy: true,
            local: true,
            social: false,
            weather: true,
            market: false
        }
    },
    MARKET_BRIEF: {
        id: 'market_brief',
        name: 'Market Brief',
        icon: '📊',
        startHour: 9,
        startMinute: 0,
        endHour: 11,
        endMinute: 55,
        sections: ['market', 'india', 'world'],
        recommended: {
            world: true,
            india: true,
            chennai: false,
            trichy: false,
            local: false,
            social: false,
            weather: false,
            market: true
        }
    },
    MIDDAY_BRIEF: {
        id: 'midday_brief',
        name: 'Midday Brief',
        icon: '☀️',
        startHour: 11,
        startMinute: 55,
        endHour: 14,
        endMinute: 30,
        sections: ['india', 'world', 'chennai', 'trichy'],
        recommended: {
            world: true,
            india: true,
            chennai: true,
            trichy: true,
            local: false,
            social: false,
            weather: true,
            market: true
        }
    },
    MARKET_MOVERS: {
        id: 'market_movers',
        name: 'Market Movers',
        icon: '📈',
        startHour: 14,
        startMinute: 30,
        endHour: 16,
        endMinute: 20,
        sections: ['market', 'india', 'world'],
        recommended: {
            world: true,
            india: true,
            chennai: false,
            trichy: false,
            local: false,
            social: false,
            weather: false,
            market: true
        }
    },
    EVENING_NEWS: {
        id: 'evening_news',
        name: 'Evening News',
        icon: '🌆',
        startHour: 16,
        startMinute: 20,
        endHour: 16,
        endMinute: 45,
        sections: ['world', 'india', 'chennai', 'trichy', 'local', 'social'],
        recommended: {
            world: true,
            india: true,
            chennai: true,
            trichy: true,
            local: true,
            social: true,
            weather: true,
            market: true
        }
    },
    LOCAL_EVENTS: {
        id: 'local_events',
        name: 'Local Events',
        icon: '📍',
        startHour: 16,
        startMinute: 45,
        endHour: 19,
        endMinute: 30,
        sections: ['chennai', 'trichy', 'local', 'social'],
        recommended: {
            world: false,
            india: true,
            chennai: true,
            trichy: true,
            local: true,
            social: true,
            weather: true,
            market: false
        }
    },
    NIGHT_WRAP_UP: {
        id: 'night_wrap_up',
        name: 'Night Wrap-Up',
        icon: '🌙',
        startHour: 19,
        startMinute: 30,
        endHour: 20,
        endMinute: 0,
        sections: ['world', 'india', 'chennai', 'trichy', 'local', 'social', 'market'],
        recommended: {
            world: true,
            india: true,
            chennai: true,
            trichy: true,
            local: true,
            social: true,
            weather: true,
            market: true
        }
    },
    URGENT_ONLY: {
        id: 'urgent_only',
        name: 'Urgent Alerts Only',
        icon: '🔔',
        startHour: 20,
        startMinute: 0,
        endHour: 6,
        endMinute: 55,
        sections: ['urgent'],
        recommended: {
            world: false,
            india: false,
            chennai: false,
            trichy: false,
            local: false,
            social: false,
            weather: true,
            market: false
        }
    }
};

/**
 * Get current time segment based on local time
 * @param {Date} date - Optional date to check, defaults to now
 * @returns {Object} Current segment object
 */
export function getCurrentSegment(date = new Date()) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    // Convert segment times to total minutes for comparison
    const segmentList = Object.values(SEGMENTS);

    for (const segment of segmentList) {
        const startTotal = segment.startHour * 60 + segment.startMinute;
        let endTotal = segment.endHour * 60 + segment.endMinute;

        // Handle overnight segment (URGENT_ONLY: 20:00 - 06:55)
        if (segment.id === 'urgent_only') {
            if (totalMinutes >= startTotal || totalMinutes < endTotal) {
                return segment;
            }
        } else {
            if (totalMinutes >= startTotal && totalMinutes < endTotal) {
                return segment;
            }
        }
    }

    // Default to urgent only if no match
    return SEGMENTS.URGENT_ONLY;
}

/**
 * Get recommended section toggles based on current segment
 * @param {Object} segment - Current segment object
 * @returns {Object} Recommended toggle states
 */
export function getRecommendedToggles(segment) {
    return segment?.recommended || {
        world: true,
        india: true,
        chennai: true,
        trichy: true,
        local: true,
        social: false,
        weather: true,
        market: false
    };
}

/**
 * Get weather time blocks based on current time
 * If evening, show: Evening, Tomorrow Morning, Tomorrow Noon
 * If morning, show: Morning, Noon, Evening
 * etc.
 * @param {Date} date - Optional date to check
 * @returns {Array} Array of time block labels with dates
 */
export function getWeatherTimeBlocks(date = new Date()) {
    const hours = date.getHours();

    const blocks = [];
    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (hours >= 6 && hours < 11) {
        // Morning: Show Morning, Noon, Evening (today)
        blocks.push({ label: 'Morning', sublabel: 'Today', date: date, period: 'morning' });
        blocks.push({ label: 'Noon', sublabel: 'Today', date: date, period: 'noon' });
        blocks.push({ label: 'Evening', sublabel: 'Today', date: date, period: 'evening' });
    } else if (hours >= 11 && hours < 16) {
        // Noon: Show Noon, Evening (today), Morning (tomorrow)
        blocks.push({ label: 'Noon', sublabel: 'Today', date: date, period: 'noon' });
        blocks.push({ label: 'Evening', sublabel: 'Today', date: date, period: 'evening' });
        blocks.push({ label: 'Morning', sublabel: 'Tomorrow', date: tomorrow, period: 'morning' });
    } else if (hours >= 16 && hours < 20) {
        // Evening: Show Evening, Morning (tomorrow), Noon (tomorrow)
        blocks.push({ label: 'Evening', sublabel: 'Today', date: date, period: 'evening' });
        blocks.push({ label: 'Morning', sublabel: 'Tmrw', date: tomorrow, period: 'morning' });
        blocks.push({ label: 'Noon', sublabel: 'Tmrw', date: tomorrow, period: 'noon' });
    } else {
        // Night (20:00+): Show Morning, Noon, Evening (all tomorrow)
        blocks.push({ label: 'Morning', sublabel: 'Tmrw', date: tomorrow, period: 'morning' });
        blocks.push({ label: 'Noon', sublabel: 'Tmrw', date: tomorrow, period: 'noon' });
        blocks.push({ label: 'Evening', sublabel: 'Tmrw', date: tomorrow, period: 'evening' });
    }

    return blocks;
}

/**
 * Format segment time range for display
 * @param {Object} segment - Segment object
 * @returns {string} Formatted time range
 */
export function formatSegmentTime(segment) {
    if (!segment) return '';

    // Fallback: If segment object lacks detailed time info (e.g. from scheduler), look it up
    let targetSegment = segment;
    if (segment.startHour === undefined && segment.id) {
        const found = Object.values(SEGMENTS).find(s => s.id === segment.id);
        if (found) targetSegment = found;
    }

    // If we still don't have valid time data, return empty string or a default
    if (targetSegment.startHour === undefined) return '';

    const formatTime = (h, m) => {
        const hour = h % 12 || 12;
        const ampm = h < 12 ? 'AM' : 'PM';
        const min = (m || 0).toString().padStart(2, '0');
        return `${hour}:${min} ${ampm}`;
    };

    return `${formatTime(targetSegment.startHour, targetSegment.startMinute)} - ${formatTime(targetSegment.endHour, targetSegment.endMinute)}`;
}

/**
 * Check if DT Next section should be shown (only in Morning News segment)
 * @param {Object} segment - Current segment
 * @returns {boolean}
 */
export function shouldShowDTNext(segment) {
    return segment.id === 'morning_news';
}

/**
 * Get all available segments for display in settings
 * @returns {Array} Array of segment objects
 */
export function getAllSegments() {
    return Object.values(SEGMENTS);
}

/**
 * Get topline summary based on current segment
 * @param {Object} segment - Current segment
 * @returns {string} Topline header text
 */
export function getTopline(segment) {
    if (!segment) return "Welcome to Daily Event AI";
    switch (segment.id) {
        case 'morning_weather': return "Good Morning! Here's your weather start.";
        case 'morning_news': return "Your Morning Headlines are ready.";
        case 'market_brief': return "Market Open: Sensex & Nifty Updates.";
        case 'midday_brief': return "Midday Update: Top stories so far.";
        case 'market_movers': return "Market Movers: Gainers & Losers.";
        case 'evening_news': return "Evening Wrap: Catch up on the day.";
        case 'local_events': return "How your evening looks around town.";
        case 'night_wrap_up': return "The Day in Review.";
        case 'urgent_only': return "Urgent Updates Only.";
        default: return "Daily Event AI: Live Updates.";
    }
}
