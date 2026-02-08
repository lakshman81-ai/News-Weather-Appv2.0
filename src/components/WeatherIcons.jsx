/**
 * 16 SVG weather icons — time-of-day + condition-aware.
 *
 * IDs follow the pattern: {period}_{condition}
 *   period: day | night | dawn | dusk
 *   condition: clear | partlyCloudy | cloudy | overcast |
 *              lightRain | rain | heavyRain | storm |
 *              fog | drizzle | snow | hail | wind
 *
 * Usage: <WeatherIcon id="day_clear" size={32} />
 */
import React from 'react';

const S = 32; // default viewBox size

const icons = {
    day_clear: (
        <g>
            <circle cx="16" cy="16" r="6" fill="#FFD93D" />
            {[0,45,90,135,180,225,270,315].map(a => (
                <line key={a} x1="16" y1="4" x2="16" y2="7"
                    stroke="#FFD93D" strokeWidth="2" strokeLinecap="round"
                    transform={`rotate(${a} 16 16)`} />
            ))}
        </g>
    ),
    night_clear: (
        <g>
            <path d="M20 6 A10 10 0 1 0 26 20 A7 7 0 1 1 20 6Z" fill="#B8C5E8" />
            <circle cx="24" cy="7" r="1" fill="#FFE" />
            <circle cx="27" cy="12" r="0.7" fill="#FFE" />
        </g>
    ),
    dawn_clear: (
        <g>
            <rect x="0" y="22" width="32" height="10" fill="#FF9F43" opacity="0.3" rx="2" />
            <circle cx="16" cy="22" r="6" fill="#FFD93D" />
            {[0,30,60,90,120,150,180].map(a => (
                <line key={a} x1="16" y1="14" x2="16" y2="12"
                    stroke="#FFD93D" strokeWidth="1.5" strokeLinecap="round"
                    transform={`rotate(${a} 16 22)`} />
            ))}
        </g>
    ),
    dusk_clear: (
        <g>
            <rect x="0" y="22" width="32" height="10" fill="#E74C3C" opacity="0.25" rx="2" />
            <circle cx="16" cy="22" r="6" fill="#FF6B6B" />
            {[0,30,60,90,120,150,180].map(a => (
                <line key={a} x1="16" y1="14" x2="16" y2="12"
                    stroke="#FF6B6B" strokeWidth="1.5" strokeLinecap="round"
                    transform={`rotate(${a} 16 22)`} />
            ))}
        </g>
    ),

    day_partlyCloudy: (
        <g>
            <circle cx="12" cy="12" r="5" fill="#FFD93D" />
            {[0,60,120,180,240,300].map(a => (
                <line key={a} x1="12" y1="5" x2="12" y2="3"
                    stroke="#FFD93D" strokeWidth="1.5" strokeLinecap="round"
                    transform={`rotate(${a} 12 12)`} />
            ))}
            <ellipse cx="20" cy="22" rx="9" ry="5" fill="#C8D6E5" />
            <ellipse cx="17" cy="19" rx="5" ry="4" fill="#DFE6ED" />
        </g>
    ),
    night_partlyCloudy: (
        <g>
            <path d="M10 6 A6 6 0 1 0 14 12 A4 4 0 1 1 10 6Z" fill="#B8C5E8" />
            <ellipse cx="20" cy="22" rx="9" ry="5" fill="#636E83" />
            <ellipse cx="17" cy="19" rx="5" ry="4" fill="#778CA3" />
        </g>
    ),

    day_cloudy: (
        <g>
            <ellipse cx="16" cy="20" rx="11" ry="6" fill="#C8D6E5" />
            <ellipse cx="12" cy="15" rx="6" ry="5" fill="#DFE6ED" />
            <ellipse cx="20" cy="16" rx="5" ry="4" fill="#DFE6ED" />
        </g>
    ),
    day_overcast: (
        <g>
            <ellipse cx="16" cy="20" rx="12" ry="6" fill="#99A4B2" />
            <ellipse cx="12" cy="15" rx="7" ry="5" fill="#A4B0BE" />
            <ellipse cx="21" cy="16" rx="5" ry="4" fill="#A4B0BE" />
        </g>
    ),

    day_fog: (
        <g>
            {[14,18,22].map((y, i) => (
                <line key={i} x1="4" y1={y} x2="28" y2={y}
                    stroke="#B0BEC5" strokeWidth="2.5" strokeLinecap="round" opacity={0.5 + i * 0.15} />
            ))}
            <circle cx="16" cy="9" r="4" fill="#FFD93D" opacity="0.4" />
        </g>
    ),

    day_drizzle: (
        <g>
            <ellipse cx="16" cy="14" rx="10" ry="5" fill="#C8D6E5" />
            <ellipse cx="12" cy="11" rx="5" ry="4" fill="#DFE6ED" />
            {[10,16,22].map((x, i) => (
                <line key={i} x1={x} y1="21" x2={x - 1} y2="25"
                    stroke="#74B9FF" strokeWidth="1.5" strokeLinecap="round" />
            ))}
        </g>
    ),

    day_lightRain: (
        <g>
            <ellipse cx="16" cy="13" rx="10" ry="5" fill="#B0BEC5" />
            <ellipse cx="12" cy="10" rx="5" ry="4" fill="#C8D6E5" />
            {[9,14,19,24].map((x, i) => (
                <line key={i} x1={x} y1="20" x2={x - 1.5} y2="26"
                    stroke="#74B9FF" strokeWidth="1.5" strokeLinecap="round" />
            ))}
        </g>
    ),

    day_rain: (
        <g>
            <ellipse cx="16" cy="12" rx="11" ry="5" fill="#99A4B2" />
            <ellipse cx="12" cy="9" rx="6" ry="4" fill="#A4B0BE" />
            {[8,13,18,23].map((x, i) => (
                <line key={i} x1={x} y1="19" x2={x - 2} y2="27"
                    stroke="#0984E3" strokeWidth="2" strokeLinecap="round" />
            ))}
        </g>
    ),

    day_heavyRain: (
        <g>
            <ellipse cx="16" cy="11" rx="12" ry="5" fill="#636E72" />
            <ellipse cx="12" cy="8" rx="6" ry="4" fill="#778CA3" />
            {[7,12,17,22,27].map((x, i) => (
                <line key={i} x1={x} y1="18" x2={x - 3} y2="28"
                    stroke="#0984E3" strokeWidth="2.5" strokeLinecap="round" />
            ))}
        </g>
    ),

    day_storm: (
        <g>
            <ellipse cx="16" cy="10" rx="12" ry="5" fill="#4A4A4A" />
            <ellipse cx="12" cy="7" rx="6" ry="4" fill="#636E72" />
            <polygon points="17,14 13,22 16,22 14,29 21,20 17,20 19,14" fill="#FDCB6E" />
            {[8,24].map((x, i) => (
                <line key={i} x1={x} y1="17" x2={x - 2} y2="25"
                    stroke="#0984E3" strokeWidth="2" strokeLinecap="round" />
            ))}
        </g>
    ),

    day_snow: (
        <g>
            <ellipse cx="16" cy="13" rx="10" ry="5" fill="#C8D6E5" />
            <ellipse cx="12" cy="10" rx="5" ry="4" fill="#DFE6ED" />
            {[10,16,22].map((x, i) => (
                <text key={i} x={x} y={25} textAnchor="middle" fontSize="6" fill="#74B9FF">*</text>
            ))}
        </g>
    ),

    day_wind: (
        <g>
            <path d="M4 14 Q12 10, 20 14 Q26 16, 28 12" fill="none" stroke="#78909C" strokeWidth="2" strokeLinecap="round" />
            <path d="M6 20 Q14 16, 22 20 Q27 22, 29 18" fill="none" stroke="#90A4AE" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M8 26 Q15 22, 24 26" fill="none" stroke="#B0BEC5" strokeWidth="1.5" strokeLinecap="round" />
        </g>
    ),
};

// Alias mapping — night versions of rain/storm reuse day icons with darker clouds
const aliasMap = {
    night_cloudy: 'day_overcast',
    night_overcast: 'day_overcast',
    night_fog: 'day_fog',
    night_drizzle: 'day_drizzle',
    night_lightRain: 'day_lightRain',
    night_rain: 'day_rain',
    night_heavyRain: 'day_heavyRain',
    night_storm: 'day_storm',
    night_snow: 'day_snow',
    night_wind: 'day_wind',
    dawn_partlyCloudy: 'day_partlyCloudy',
    dawn_cloudy: 'day_cloudy',
    dawn_rain: 'day_rain',
    dusk_partlyCloudy: 'day_partlyCloudy',
    dusk_cloudy: 'day_cloudy',
    dusk_rain: 'day_rain',
};

export default function WeatherIcon({ id, size = 32, className = '' }) {
    const resolved = icons[id] || icons[aliasMap[id]] || icons['day_cloudy'];
    return (
        <svg
            viewBox={`0 0 ${S} ${S}`}
            width={size}
            height={size}
            className={className}
            aria-label={id?.replace(/_/g, ' ')}
        >
            {resolved}
        </svg>
    );
}

/**
 * Maps WMO weather code + hour + temp to an icon ID.
 *
 * @param {number} code  - WMO weather code (0–99)
 * @param {number} hour  - 0–23
 * @param {number} [temp]  - temperature in °C (unused for now, reserved)
 * @param {number} [wind]  - wind speed km/h (unused for now, reserved)
 * @returns {string} icon ID like "day_clear"
 */
export function getWeatherIconId(code, hour, temp, wind) {
    const period = getPeriod(hour);
    const condition = codeToCondition(code);
    const id = `${period}_${condition}`;
    // Return the id if it exists directly or as an alias
    if (icons[id] || aliasMap[id]) return id;
    return `day_${condition}`;
}

function getPeriod(hour) {
    if (hour >= 6 && hour < 8) return 'dawn';
    if (hour >= 8 && hour < 17) return 'day';
    if (hour >= 17 && hour < 19) return 'dusk';
    return 'night';
}

function codeToCondition(code) {
    if (code === 0) return 'clear';
    if (code <= 1) return 'clear';
    if (code === 2) return 'partlyCloudy';
    if (code === 3) return 'overcast';
    if (code >= 45 && code <= 48) return 'fog';
    if (code >= 51 && code <= 55) return 'drizzle';
    if (code >= 56 && code <= 57) return 'drizzle'; // freezing drizzle
    if (code === 61) return 'lightRain';
    if (code === 63) return 'rain';
    if (code === 65) return 'heavyRain';
    if (code >= 66 && code <= 67) return 'rain'; // freezing rain
    if (code >= 71 && code <= 77) return 'snow';
    if (code >= 80 && code <= 82) return 'rain'; // rain showers
    if (code === 85 || code === 86) return 'snow'; // snow showers
    if (code >= 95 && code <= 99) return 'storm';
    return 'cloudy';
}
