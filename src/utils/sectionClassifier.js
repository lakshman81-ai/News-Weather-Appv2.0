import { SECTION_KEYWORDS } from '../data/sectionKeywords.js';
import { ENTITY_OVERRIDES } from '../data/entityOverrides.js';

/**
 * Classifies an article into a section based on content
 *
 * Algorithm:
 * 1. Check entity overrides (exact match)
 * 2. Score all sections by keyword matches
 * 3. Return highest scoring section (if score >= threshold)
 * 4. Return null if no match (caller should fallback to original section)
 *
 * @param {string} title
 * @param {string} description
 * @param {string} source
 * @returns {string|null} - The detected section key or null
 */
export function classifySection(title, description, source = '') {
    // Combine text for analysis
    const text = `${title} ${description}`.toLowerCase();

    // Step 1: Entity Override Check
    // We iterate through keys to find if any entity is present in the text
    for (const [entity, section] of Object.entries(ENTITY_OVERRIDES)) {
        if (text.includes(entity.toLowerCase())) {
            // console.log(`[Classifier] Entity override: "${entity}" → ${section}`);
            return section;
        }
    }

    // Step 2: Keyword Scoring
    const scores = {};
    // Initialize scores
    Object.keys(SECTION_KEYWORDS).forEach(key => scores[key] = 0);

    for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
        keywords.forEach(keyword => {
            // Use word boundary check for short words to avoid false positives (e.g. "un" in "fun")
            // For longer phrases, simple includes is usually fine and faster
            const kLower = keyword.toLowerCase();
            if (kLower.length <= 3) {
                 // Simple boundary check: space before/after or start/end of string
                 // Note: This is a lightweight regex replacement
                 const regex = new RegExp(`\\b${kLower}\\b`, 'i');
                 if (regex.test(text)) {
                     scores[section]++;
                 }
            } else {
                if (text.includes(kLower)) {
                    scores[section]++;
                }
            }
        });
    }

    // Step 3: Find highest scoring section
    const sortedSections = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
    const topSection = sortedSections[0];
    const topScore = scores[topSection];

    // Threshold: require at least 2 keyword matches to confidently re-classify
    // Exception: If the topScore is high relative to length, or if it's very specific
    // For now, strict threshold of 2
    if (topScore >= 2) {
        // console.log(`[Classifier] "${title.substring(0, 30)}..." → ${topSection} (score: ${topScore})`);
        return topSection;
    }

    // Step 4: No strong match
    return null;
}

/**
 * Testing Function (Can be called from console)
 */
export function testClassification() {
    const testCases = [
        { title: "Chennai floods affect thousands in Velachery", expected: "chennai" },
        { title: "Modi announces new economic policy in Delhi", expected: "india" },
        { title: "Rajinikanth new movie release date confirmed", expected: "entertainment" },
        { title: "CSK wins IPL final against MI", expected: "sports" },
        { title: "Apple launches new iPhone 16 with AI features", expected: "technology" },
        { title: "Sensex crosses 80000 mark as Nifty soars", expected: "business" },
        { title: "UN condemns Russia actions in Ukraine war", expected: "world" },
        { title: "Generic news about nothing specific", expected: null }
    ];

    console.log("--- Starting Classification Tests ---");
    let passed = 0;
    testCases.forEach(({ title, expected }) => {
        const result = classifySection(title, '');
        const pass = result === expected;
        const icon = pass ? '✅' : '❌';
        console.log(`${icon} "${title}" → ${result} (expected: ${expected})`);
        if (pass) passed++;
    });

    console.log(`Test Results: ${passed}/${testCases.length} passed`);
    console.log("-------------------------------------");
}
