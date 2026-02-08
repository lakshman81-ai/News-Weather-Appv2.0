import React, { useState } from 'react';
import { getWeatherTimeBlocks } from '../utils/timeSegment';
import { getRainStatus, getRainStyle } from '../utils/weatherUtils';
import WeatherIcon from './WeatherIcons';

// Splash-style humidity SVG (matches QuickWeather)
const HumidityIcon = ({ size = '1em' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ color: '#60a5fa', verticalAlign: 'middle' }}>
        <path d="M12,2 C12,2 7,7 7,10 C7,12.76 9.24,15 12,15 C14.76,15 17,12.76 17,10 C17,7 12,2 12,2 Z" opacity="0.9" />
        <path d="M6,12 C6,12 4,14 4,15.5 C4,16.6 4.9,17.5 6,17.5 C7.1,17.5 8,16.6 8,15.5 C8,14 6,12 6,12 Z" opacity="0.7" />
        <path d="M18,12 C18,12 16,14 16,15.5 C16,16.6 16.9,17.5 18,17.5 C19.1,17.5 20,16.6 20,15.5 C20,14 18,12 18,12 Z" opacity="0.7" />
    </svg>
);

/**
 * Weather Card Component
 * Displays weather for Chennai, Trichy, Muscat with:
 * - 3 time rows (Morning/Noon/Evening based on current time)
 * - Temperature with feels-like
 * - Rain probability (averaged from 3 models with confidence indicator)
 * - Rain amount in mm
 * - Enhanced metrics: UV, Humidity, Wind, Cloud Cover
 * - Per-location summaries
 * - Model source attribution
 */
function WeatherCard({ weatherData }) {
    const [expandedHourly, setExpandedHourly] = useState({});
    const timeBlocks = getWeatherTimeBlocks();
    const cities = ['chennai', 'trichy', 'muscat'];

    const toggleHourly = (key) => {
        setExpandedHourly(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Stale Data Check (4 hours)
    const isStale = weatherData.fetchedAt && (Date.now() - weatherData.fetchedAt > 4 * 3600 * 1000);

    // Check if any city has severe weather
    const hasSevereWeather = cities.some(city => weatherData[city]?.isSevere);
    const severeAlert = cities.find(city => weatherData[city]?.alert)
        ? weatherData[cities.find(city => weatherData[city]?.alert)]?.alert
        : null;

    // Get UV index color class
    const getUVClass = (uvIndex) => {
        if (uvIndex == null) return '';
        if (uvIndex <= 2) return 'uv-low';
        if (uvIndex <= 5) return 'uv-moderate';
        if (uvIndex <= 7) return 'uv-high';
        if (uvIndex <= 10) return 'uv-very-high';
        return 'uv-extreme';
    };

    const getUVLabel = (uvIndex) => {
        if (uvIndex == null) return 'N/A';
        if (uvIndex <= 2) return 'Low';
        if (uvIndex <= 5) return 'Moderate';
        if (uvIndex <= 7) return 'High';
        if (uvIndex <= 10) return 'Very High';
        return 'Extreme';
    };

    // Get wind direction arrow
    const getWindDirection = (degrees) => {
        if (degrees == null) return '';
        const directions = ['↓', '↙', '←', '↖', '↑', '↗', '→', '↘'];
        const index = Math.round(((degrees % 360) / 45)) % 8;
        return directions[index];
    };

    return (
        <section className={`weather-section ${hasSevereWeather ? 'weather-section--severe' : ''}`}>
            <h2 className="weather-section__title">
                <span>☁️</span>
                Weather Forecast
                {hasSevereWeather && <span style={{ marginLeft: '8px' }}>⚠️</span>}
                {isStale && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--accent-warning)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '1.2rem' }}>🕰️</span>
                        Stale Data
                    </span>
                )}
            </h2>

            <div className="card">
                <div className="weather-grid">
                    {/* Header Row */}
                    <div className="weather-grid__header"></div>
                    {cities.map(city => (
                        <div key={city} className="weather-grid__header">
                            {weatherData[city]?.icon} {weatherData[city]?.name}
                            {city === 'muscat' && weatherData[city]?.localTime && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    {weatherData[city].localTime}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Time Block Rows */}
                    {timeBlocks.map((block, idx) => (
                        <React.Fragment key={idx}>
                            <div className="weather-grid__time">
                                <span>{block.label}</span>
                                <span className="weather-grid__time-label">{block.sublabel}</span>
                            </div>
                            {cities.map(city => {
                                // When sublabel indicates tomorrow, read from the tomorrow nested object
                                const isTomorrow = block.sublabel === 'Tmrw' || block.sublabel === 'Tomorrow';
                                const cityData = weatherData[city];
                                const data = isTomorrow
                                    ? cityData?.tomorrow?.[block.period]
                                    : cityData?.[block.period];
                                if (!data) {
                                    return (
                                        <div key={city} className="weather-grid__cell">
                                            <span style={{ color: 'var(--text-muted)' }}>N/A</span>
                                        </div>
                                    );
                                }
                                return (
                                    <div key={city} className="weather-grid__cell">
                                        <div className="weather-icon">
                                            {data.iconId ? <WeatherIcon id={data.iconId} size={28} /> : data.icon}
                                        </div>
                                        <div className="weather-temp">{data.temp}°C</div>
                                        <div className="weather-feels">Feels {data.feelsLike}°</div>

                                        {/* Enhanced Rainfall Display - Dynamic Palette */}
                                        {(() => {
                                            // rainProb is a consensus object { avg, min, max, ... } from calculateRainfallConsensus()
                                            const status = getRainStatus(data.rainProb?.avg, data.rainMm);
                                            if (!status) return null;
                                            const style = getRainStyle(status.intensity);
                                            return (
                                                <div className="weather-rain" style={{ marginTop: '4px' }}>
                                                    <span className="weather-rain-prob" style={style}>
                                                        {status.icon} {status.label}
                                                    </span>
                                                    {data.rainProb?.isWideRange && (
                                                        <span title="Models disagree" style={{ fontSize: '0.7rem', marginLeft: '4px', cursor: 'help' }}>⚠️</span>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* Hourly Forecast Expansion if Precip > 5mm */}
                                        {data.rainMm && parseFloat(data.rainMm) > 5 && (
                                            <div style={{ marginTop: '8px' }}>
                                                <button
                                                    onClick={() => toggleHourly(`${city}-${block.period}`)}
                                                    style={{
                                                        background: 'rgba(255,255,255,0.1)',
                                                        border: 'none',
                                                        borderRadius: '12px',
                                                        padding: '4px 8px',
                                                        fontSize: '0.7rem',
                                                        cursor: 'pointer',
                                                        color: 'var(--accent-primary)',
                                                        width: '100%'
                                                    }}
                                                >
                                                    {expandedHourly[`${city}-${block.period}`] ? 'Hide Hourly' : 'Show Hourly'}
                                                </button>

                                                {expandedHourly[`${city}-${block.period}`] && data.hourly && (
                                                    <div style={{ marginTop: '8px', fontSize: '0.7rem' }}>
                                                        {data.hourly.map((h, i) => (
                                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                                <span>{h.time}</span>
                                                                <span style={{color:'var(--weather-rain)'}}>{h.precip?.toFixed(1)}mm ({h.prob}%)</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Additional Metrics — always render all 4 for alignment */}
                                        <div className="weather-extra-metrics weather-metrics-grid">
                                            <div className="weather-metric">
                                                <HumidityIcon size="0.95em" /> {data.humidity ?? '—'}%
                                            </div>
                                            <div className="weather-metric">
                                                🌬️ {data.windSpeed ?? '—'}
                                            </div>
                                            <div className={`weather-metric ${getUVClass(data.uvIndex)}`}>
                                                ☀️ UV {data.uvIndex ?? '—'}
                                            </div>
                                            <div className="weather-metric">
                                                ☁️ {data.cloudCover ?? '—'}%
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>

                {/* Per-Location Summaries */}
                <div style={{ marginTop: 'var(--spacing-md)' }}>
                    {cities.map(city => (
                        <div
                            key={city}
                            className="weather-summary"
                            style={{
                                marginBottom: 'var(--spacing-sm)',
                                borderRadius: 'var(--radius-sm)'
                            }}
                        >
                            <span className="weather-summary__icon">
                                {weatherData[city]?.icon || '📝'}
                            </span>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    marginBottom: '4px',
                                    color: 'var(--text-primary)'
                                }}>
                                    {weatherData[city]?.name}
                                    {weatherData[city]?.current?.humidity != null && (
                                        <span style={{
                                            marginLeft: '8px',
                                            fontSize: '0.75rem',
                                            color: 'var(--text-muted)',
                                            fontWeight: 400
                                        }}>
                                            <HumidityIcon size="0.85em" /> {weatherData[city].current.humidity}% •
                                            🌬️ {weatherData[city].current.windSpeed || 0} km/h {getWindDirection(weatherData[city].current.windDirection)}
                                        </span>
                                    )}
                                </div>
                                <span style={{ lineHeight: 1.6 }}>
                                    {weatherData[city]?.summary || 'Weather summary not available.'}
                                </span>
                            </div>
                        </div>
                    ))}

                    {/* Rainfall Consensus Legend */}
                    <div style={{
                        fontSize: '0.65rem',
                        color: 'var(--text-muted)',
                        marginTop: '8px',
                        padding: '6px 8px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-sm)',
                        borderLeft: '3px solid var(--accent-primary)'
                    }}>
                        <strong>Rainfall Indicator:</strong>
                        <span style={{ marginLeft: '6px' }}>
                            <span className="rain-confident">~</span> = Models agree (±30%)
                        </span>
                        <span style={{ marginLeft: '12px' }}>
                            <span className="rain-uncertain">⚠️ !</span> = Wide range (&gt;30% spread)
                        </span>
                    </div>
                </div>

                {/* Severe Weather Alert */}
                {severeAlert && (
                    <div className="weather-alert">
                        <span className="weather-alert__icon">{severeAlert.icon}</span>
                        <div>
                            <div className="weather-alert__text">{severeAlert.type}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {severeAlert.message}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

export default WeatherCard;
