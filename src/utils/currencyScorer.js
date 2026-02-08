import { getSettings } from './storage.js';

/**
 * Calculates currency score based on user's followed topics.
 */
export function calculateCurrencyScore(title, keywords = []) {
    const settings = getSettings();
    const followedTopics = settings.followedTopics || [];

    // If no topics followed, no boost
    if (followedTopics.length === 0) return 1.0;

    const text = title.toLowerCase();

    // Check match
    const hasMatch = followedTopics.some(topic => {
        // Handle both string topics (legacy) and object topics (new)
        // Prefer 'name' for matching as 'query' might contain boolean operators
        const keyword = (typeof topic === 'string') ? topic : topic.name;
        if (!keyword) return false;

        const keywordLower = keyword.toLowerCase();
        return text.includes(keywordLower) ||
        (keywords && keywords.some(k => k.toLowerCase().includes(keywordLower)));
    });

    return hasMatch ? 1.5 : 1.0;
}
