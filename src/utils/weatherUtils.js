/**
 * Weather Utility Functions
 */

/**
 * Determine the display status for rainfall based on probability and amount.
 * @param {number} prob - Rain probability percentage (0-100)
 * @param {string|number} mmStr - Rain amount string (e.g. "2.5mm") or number
 * @returns {Object} { icon, label, className, intensity }
 */
export function getRainStatus(prob, mmStr) {
    let mm = 0;
    if (typeof mmStr === 'string') {
        mm = parseFloat(mmStr.replace('mm', '')) || 0;
    } else {
        mm = mmStr || 0;
    }

    const p = prob || 0;

    // Strict check: if no probability and no mm, return null
    if (p <= 0 && mm <= 0) {
        return null;
    }

    // Intensity calculation
    let intensity = 'light';
    let icon = '🌧️';

    // Logic Refinement:
    // User complaint: "Rainfall icon not appearing" for "50% prob, 0.4mm".
    // 50% prob is significant. 0.4mm is light.

    if (mm >= 10 || (p >= 80 && mm >= 5)) {
        intensity = 'heavy';
        icon = '⛈️';
    } else if (mm >= 2 || p >= 60) {
        intensity = 'moderate';
        icon = '🌧️';
    } else {
        // Light rain
        if (p < 30 && mm < 1) {
             intensity = 'trace';
             icon = '🌦️';
        } else {
             intensity = 'light';
             icon = '🌧️';
        }
    }

    // Label formatting
    let label = '';

    // Always show probability if > 0
    if (p > 0) label += `${p}%`;

    // Show MM logic
    if (mm > 0) {
        if (label) label += ' • ';
        // Explicitly handle small amounts
        if (mm < 0.1) {
            label += 'Trace';
        } else {
            label += `${mm.toFixed(1)}mm`;
        }
    } else if (p > 0) {
        // If only probability (no mm forecast yet), just show chance
        // label += ' chance'; // "50% chance" takes too much space, "50%" is enough
    }

    return { icon, label, intensity, mm, prob: p };
}

/**
 * Get CSS color style for rain intensity
 * @param {string} intensity - 'light', 'moderate', 'heavy', 'trace'
 * @returns {Object} Style object
 */
export function getRainStyle(intensity) {
    switch (intensity) {
        case 'heavy':
            return { color: '#ef4444', fontWeight: 'bold' }; // Red/Danger
        case 'moderate':
            return { color: '#60a5fa', fontWeight: '600' }; // Blue (lighter than before for contrast)
        case 'trace':
             return { color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9em' }; // Grey/Italic for trace
        case 'light':
        default:
            // Improved visibility for light rain
            return { color: '#e2e8f0', opacity: 0.9 }; // Slate-200
    }
}
