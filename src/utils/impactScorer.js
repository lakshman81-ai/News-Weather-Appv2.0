/**
 * Calculates impact score based on:
 * 1. Geographic scale (global > national > regional > local)
 * 2. Population magnitude (millions > thousands > individuals)
 */
export function calculateImpactScore(title, description) {
    const text = `${title} ${description}`.toLowerCase();

    // 1. Scale Detection
    let scaleScore = 1.0;
    if (/\b(world|international|global|planet|earth|un|united nations)\b/.test(text)) {
        scaleScore = 1.5; // Global
    } else if (/\b(india|country|nation|nationwide|federal|central govt|modi|parliament)\b/.test(text)) {
        scaleScore = 1.3; // National
    } else if (/\b(state|tamil nadu|kerala|karnataka|region|district)\b/.test(text)) {
        scaleScore = 1.1; // Regional
    }

    // 2. Magnitude Detection (Population/Financial Impact)
    let magnitudeScore = 1.0;

    // Billions/Trillions
    if (/\b(billions?|trillions?)\b/.test(text)) {
        magnitudeScore = 1.5;
    }
    // Millions / Lakhs / Crores
    else if (/\b(millions?|lakhs?|crores?)\b/.test(text)) {
        magnitudeScore = 1.3;
    }
    // Thousands
    else if (/\b(thousands?|hundreds of thousands?)\b/.test(text)) {
        magnitudeScore = 1.1;
    }

    // Combined multiplier (Base 1.0, max ~2.25)
    return scaleScore * magnitudeScore;
}
