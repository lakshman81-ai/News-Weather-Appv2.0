import React from 'react';
import Header from '../components/Header';
import WeatherCard from '../components/WeatherCard';
import { useWeather } from '../context/WeatherContext';


/**
 * Weather Page
 * Dedicated page for detailed weather forecast
 */
function WeatherPage() {
    const { weatherData, loading, error, refreshWeather } = useWeather();

    // Use real data, if loading show spinner or skeletal (handled by parent/logic could improve)
    // For now, if no data and no error, it might be loading or initial.
    const displayData = weatherData;

    const handleRefresh = () => {
        refreshWeather(true);
    };

    // Prevent crash when weatherData is null (loading or error state)
    if (loading && !weatherData) {
        return (
            <div className="page-container">
                <Header title="Weather Forecast" icon="☁️" />
                <main className="main-content">
                    <div className="loading">
                        <div className="loading__spinner"></div>
                        <span>Loading Forecast...</span>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="page-container">
            <Header
                title="Weather Forecast"
                icon="☁️"
                actions={
                    <button
                        onClick={handleRefresh}
                        className="header__action-btn"
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        {loading ? '⟳' : '🔄'}
                    </button>
                }
            />

            <main className="main-content">
                {error && (
                    <div className="topline" style={{ borderLeftColor: 'var(--accent-danger)' }}>
                        <div className="topline__label" style={{ color: 'var(--accent-danger)' }}>Error</div>
                        <div className="topline__text">Failed to update weather. Showing cached data.</div>
                    </div>
                )}

                {/* Only render WeatherCard if data is available */}
                {displayData ? (
                    <WeatherCard weatherData={displayData} />
                ) : (
                    <div className="empty-state">
                        <div className="empty-state__icon">☁️</div>
                        <p>Weather data unavailable.</p>
                        <button onClick={handleRefresh} className="btn btn--secondary mt-md">Retry</button>
                    </div>
                )}
            </main>
        </div>
    );
}

export default WeatherPage;
