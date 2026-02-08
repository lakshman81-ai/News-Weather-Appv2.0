import React, { useState, useEffect } from 'react';
import { useWeather } from '../context/WeatherContext';
import WeatherIcon from './WeatherIcons';

// --- SVG ICONS ---
const HumidityIcon = ({ size = '1em' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ color: '#60a5fa', verticalAlign: 'middle' }}>
        <path d="M12,2 C12,2 7,7 7,10 C7,12.76 9.24,15 12,15 C14.76,15 17,12.76 17,10 C17,7 12,2 12,2 Z" opacity="0.9" />
        <path d="M6,12 C6,12 4,14 4,15.5 C4,16.6 4.9,17.5 6,17.5 C7.1,17.5 8,16.6 8,15.5 C8,14 6,12 6,12 Z" opacity="0.7" />
        <path d="M18,12 C18,12 16,14 16,15.5 C16,16.6 16.9,17.5 18,17.5 C19.1,17.5 20,16.6 20,15.5 C20,14 18,12 18,12 Z" opacity="0.7" />
    </svg>
);

const WindIcon = ({ size = '1em' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#cbd5e1', verticalAlign: 'middle' }}>
        <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
    </svg>
);

/**
 * Quick Weather Widget — Redesigned
 * Shows present conditions for all 3 cities at a glance,
 * plus a 24-hour heads-up timeline for the selected city.
 * No pills, no fine details — just "what's now" and "what's coming".
 */
const QuickWeather = () => {
    const { weatherData, loading, error } = useWeather();
    const [activeCity, setActiveCity] = useState(() => {
        try {
            return localStorage.getItem('weather_active_city') || 'chennai';
        } catch {
            return 'chennai';
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('weather_active_city', activeCity);
        } catch {
            // Ignore storage errors
        }
    }, [activeCity]);

    if (loading) return <div className="quick-weather-card qw-bg-day"><div style={{ textAlign: 'center', padding: '20px 0' }}>Loading weather...</div></div>;
    if (error || !weatherData) return <div className="quick-weather-card qw-bg-night"><div style={{ textAlign: 'center', padding: '20px 0' }}>Weather unavailable</div></div>;

    const cities = ['chennai', 'trichy', 'muscat'];
    const cityLabels = { chennai: 'Chennai', trichy: 'Trichy', muscat: 'Muscat' };
    const cityIcons = { chennai: '🏛️', trichy: '🏯', muscat: '📍' };

    // Determine background based on current hour
    const hour = new Date().getHours();
    let bgClass = 'qw-bg-day';
    if (hour >= 6 && hour < 11) bgClass = 'qw-bg-morning';
    else if (hour >= 11 && hour < 17) bgClass = 'qw-bg-day';
    else if (hour >= 17 && hour < 20) bgClass = 'qw-bg-evening';
    else bgClass = 'qw-bg-night';

    // Check if rain is coming in the next 24h for the active city
    const activeCityData = weatherData[activeCity];
    const headsUp = getHeadsUp(activeCityData);
    const severeWarning = getSevereWarning(activeCityData);

    return (
        <section className={`quick-weather-card ${bgClass}`}>

            {/* All 3 Cities — Current Conditions */}
            <div className="qw-cities-grid">
                {cities.map(city => {
                    const d = weatherData[city];
                    if (!d?.current) return null;
                    const c = d.current;
                    const isActive = city === activeCity;
                    return (
                        <div
                            key={city}
                            className={`qw-city-card ${isActive ? 'qw-city-card--active' : ''}`}
                            onClick={() => setActiveCity(city)}
                        >
                            <div className="qw-city-header">
                                <span className="qw-city-icon">{cityIcons[city]}</span>
                                <span className="qw-city-name">{cityLabels[city]}</span>
                            </div>
                            <div className="qw-city-temp-row">
                                <span className="qw-city-temp">{c.temp}°</span>
                                <span className="qw-city-weather-icon">
                                    {c.iconId ? <WeatherIcon id={c.iconId} size={28} /> : c.icon}
                                </span>
                            </div>
                            <div className="qw-city-condition">{c.condition}</div>
                            <div className="qw-city-meta">
                                <span><HumidityIcon size="0.85em" /> {c.humidity ?? '--'}%</span>
                                <span><WindIcon size="0.85em" /> {c.windSpeed ?? '--'}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 24-Hour Timeline Strip */}
            {activeCityData?.hourly24 && (
                <div className="qw-timeline-section">
                    <div className="qw-timeline-label">
                        {getTimelineSummary(activeCityData, cityLabels[activeCity])}
                    </div>
                    <div className="qw-timeline-strip">
                        {activeCityData.hourly24.map((slot, i) => (
                            <div key={i} className="qw-timeline-slot">
                                <div className="qw-slot-time">{slot.label}</div>
                                <div className="qw-slot-icon">
                                    {slot.iconId ? <WeatherIcon id={slot.iconId} size={22} /> : slot.icon}
                                </div>
                                <div className="qw-slot-temp">{slot.temp}°</div>
                                {slot.precip > 0.5 && (
                                    <div className="qw-slot-rain">{slot.precip}mm</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Heads-Up Alert */}
            {headsUp && (
                <div className="qw-headsup">
                    <span className="qw-headsup-icon">{headsUp.icon}</span>
                    <span>{headsUp.message}</span>
                </div>
            )}

            {/* Severe Weather Warning */}
            {severeWarning && (
                <div className="qw-severe" style={{
                    background: 'rgba(220,38,38,0.15)',
                    border: '1px solid rgba(220,38,38,0.4)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    margin: '8px 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.78rem',
                    color: '#fca5a5'
                }}>
                    <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                    <span>{severeWarning}</span>
                </div>
            )}

        </section>
    );
};

/**
 * Descriptive summary for the 24h timeline section.
 * Replaces the old "Next 24h · {city}" with meaningful text.
 */
function getTimelineSummary(cityData, cityName) {
    if (!cityData?.hourly24) return `${cityName} — 24h Forecast`;

    const slots = cityData.hourly24;
    const temps = slots.map(s => s.temp).filter(t => t != null);
    const rainSlots = slots.filter(s => s.precip > 0.5 || s.prob > 40);

    const minT = temps.length > 0 ? Math.min(...temps) : null;
    const maxT = temps.length > 0 ? Math.max(...temps) : null;
    const tempRange = minT != null && maxT != null ? `${minT}°–${maxT}°` : '';

    if (rainSlots.length >= 3) {
        return `${cityName} ${tempRange} — Rainy spells ahead`;
    }
    if (rainSlots.length > 0) {
        return `${cityName} ${tempRange} — Scattered showers`;
    }
    const current = cityData.current;
    if (current?.condition) {
        return `${cityName} ${tempRange} — ${current.condition}`;
    }
    return `${cityName} ${tempRange}`;
}

/**
 * Generates a plain-English heads-up from the 24h forecast.
 * e.g. "Rain expected around 9PM–3AM (~4.2mm)"
 */
function getHeadsUp(cityData) {
    if (!cityData?.hourly24) return null;

    const slots = cityData.hourly24;

    // Find consecutive rain slots (precip > 0.5mm or prob > 40%)
    const rainSlots = slots.filter(s => s.precip > 0.5 || s.prob > 40);

    if (rainSlots.length === 0) return null;

    const totalMm = rainSlots.reduce((sum, s) => sum + (s.precip || 0), 0);
    const maxProb = Math.max(...rainSlots.map(s => s.prob || 0));

    const formatHour = (h) => {
        if (h === 0) return '12AM';
        if (h === 12) return '12PM';
        return h < 12 ? `${h}AM` : `${h - 12}PM`;
    };

    const startHour = formatHour(rainSlots[0].hour);
    const endHour = rainSlots.length > 1 ? formatHour(rainSlots[rainSlots.length - 1].hour) : null;

    let intensity = 'Rain';
    let icon = '🌧️';
    if (totalMm >= 10 || maxProb >= 80) {
        intensity = 'Heavy rain';
        icon = '⛈️';
    } else if (totalMm < 2 && maxProb < 50) {
        intensity = 'Light showers possible';
        icon = '🌦️';
    }

    const timeRange = endHour ? `${startHour}–${endHour}` : `around ${startHour}`;
    const mmText = totalMm > 0.5 ? ` (~${totalMm.toFixed(1)}mm)` : '';

    return {
        icon,
        message: `${intensity} expected ${timeRange}${mmText}`
    };
}

/**
 * Checks for severe weather conditions across the 24h forecast.
 * Returns a warning string or null.
 */
function getSevereWarning(cityData) {
    if (!cityData?.hourly24) return null;

    const slots = cityData.hourly24;
    const heavyRainSlots = slots.filter(s => s.precip >= 10);
    const stormSlots = slots.filter(s => s.prob >= 80);
    const temps = slots.map(s => s.temp).filter(t => t != null);
    const maxTemp = temps.length > 0 ? Math.max(...temps) : null;

    if (heavyRainSlots.length > 0) {
        const totalMm = heavyRainSlots.reduce((s, h) => s + h.precip, 0);
        return `Heavy rainfall warning: ${totalMm.toFixed(1)}mm expected in the next 24 hours`;
    }
    if (stormSlots.length >= 2) {
        return 'Thunderstorm activity likely in the next 24 hours';
    }
    if (maxTemp != null && maxTemp >= 42) {
        return `Extreme heat warning: Temperatures may reach ${maxTemp}°C`;
    }
    return null;
}

export default QuickWeather;
