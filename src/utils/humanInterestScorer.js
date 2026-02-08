import { HUMAN_INTEREST_KEYWORDS } from '../data/humanInterestKeywords.js';

/**
 * Calculates human interest score based on emotional/narrative keywords.
 */
export function calculateHumanInterestScore(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    let matches = 0;

    // Count matches
    HUMAN_INTEREST_KEYWORDS.forEach(keyword => {
        if (text.includes(keyword.toLowerCase())) {
            matches++;
        }
    });

    // Base 1.0 + 0.2 per match, capped at 2.0
    // e.g. "Hero rescues child" -> 2 matches -> 1.4x
    const score = 1.0 + (matches * 0.2);

    return Math.min(score, 2.0);
}
