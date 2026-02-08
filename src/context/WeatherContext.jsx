import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchWeather } from '../services/weatherService';
import { getSettings } from '../utils/storage';
import { useSettings } from './SettingsContext';

const WeatherContext = createContext();

export function WeatherProvider({ children }) {
    const { settingsVersion } = useSettings();
    const prevVersion = useRef(settingsVersion);

    const [weatherData, setWeatherData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastFetch, setLastFetch] = useState(0);

    const loadWeather = useCallback(async (force = false) => {
        const settings = getSettings();
        const freshnessLimitMs = (settings?.weatherFreshnessLimit || 4) * 60 * 60 * 1000;

        // Check freshness of existing data
        if (!force && weatherData) {
            const age = Date.now() - lastFetch;
            if (age < 15 * 60 * 1000) {
                return; // Cache valid (short term)
            }
            if (settings?.strictFreshness && age > freshnessLimitMs) {
                setWeatherData(null);
            }
        }

        setLoading(true);

        if (settings?.sections?.weather === false) {
            setLoading(false);
            return;
        }

        try {
            const cities = settings?.weather?.cities || ['chennai', 'trichy', 'muscat'];
            const results = await Promise.allSettled(
                cities.map(city => fetchWeather(city))
            );

            const data = {};
            cities.forEach((city, i) => {
                data[city] = results[i].status === 'fulfilled' ? results[i].value : null;
            });

            setWeatherData(data);
            setLastFetch(Date.now());
            setError(null);
        } catch (err) {
            console.error("Weather Context Error:", err);
            setError(err);
            setWeatherData(null);
        } finally {
            setLoading(false);
        }
    }, [weatherData, lastFetch]);

    useEffect(() => {
        loadWeather();
    }, [loadWeather]);

    // Refresh when settings change
    useEffect(() => {
        if (prevVersion.current !== settingsVersion) {
            prevVersion.current = settingsVersion;
            loadWeather(true);
        }
    }, [settingsVersion, loadWeather]);

    return (
        <WeatherContext.Provider value={{ weatherData, loading, error, refreshWeather: loadWeather }}>
            {children}
        </WeatherContext.Provider>
    );
}

export function useWeather() {
    return useContext(WeatherContext);
}
