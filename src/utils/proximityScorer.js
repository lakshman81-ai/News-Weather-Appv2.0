import { getSettings } from './storage.js';
import { LOCATIONS } from '../data/geolocation.js';

/**
 * Calculates proximity score based on user's location relevance.
 * Checks against hardcoded LOCATIONS and user settings.
 */
export function calculateProximityScore(title, description) {
    const settings = getSettings();

    // 1. Check if proximity scoring is enabled
    if (settings.enableProximityScoring === false) {
        return 1.0;
    }

    const text = `${title} ${description}`.toLowerCase();
    let maxBoost = 1.0;

    // Get weights from settings or defaults
    const cityMatchBoost = settings.rankingWeights?.geo?.cityMatch || 1.5;
    const maxScore = settings.rankingWeights?.geo?.maxScore || 5.0;

    // 2. Check against LOCATIONS list (Hardcoded priorities)
    for (const [locationName, data] of Object.entries(LOCATIONS)) {
        // Simple text matching
        if (text.includes(locationName.toLowerCase())) {
            if (data.boost > maxBoost) {
                maxBoost = data.boost;
            }
        }
    }

    // 3. Check against User Configured Cities (Settings)
    if (settings.weather?.cities) {
        for (const city of settings.weather.cities) {
            if (text.includes(city.toLowerCase())) {
                // Apply the configured city match boost
                // If this is higher than what we found in LOCATIONS, use it.
                // Or maybe we should multiply? For now, taking the max seems safer to avoid explosion.
                if (cityMatchBoost > maxBoost) {
                    maxBoost = cityMatchBoost;
                }
            }
        }
    }

    // Cap at maxScore
    return Math.min(maxBoost, maxScore);
}
