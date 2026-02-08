/**
 * Client-side extractive summarization.
 * Strategy 1: Chrome Summarizer API (Chrome 138+)
 * Strategy 2: Simple sentence scoring (TF-based, always works)
 */

/**
 * Summarize text using the best available method.
 * @param {string} text - Full article text
 * @param {number} [sentenceCount=5] - Desired summary length
 * @returns {Promise<string>} Summary text
 */
export async function summarizeText(text, sentenceCount = 5) {
    if (!text || text.length < 100) return text || '';

    // Strategy 1: Chrome Summarizer API
    const chromeSummary = await tryChromeSummarizer(text);
    if (chromeSummary) return chromeSummary;

    // Strategy 2: Simple extractive
    return extractiveSummarize(text, sentenceCount);
}

/**
 * Try Chrome's built-in Summarizer API (Chrome 138+).
 */
async function tryChromeSummarizer(text) {
    try {
        if (!('ai' in self) || !('summarizer' in self.ai)) return null;

        const available = await self.ai.summarizer.capabilities();
        if (available.available === 'no') return null;

        const summarizer = await self.ai.summarizer.create({
            type: 'key-points',
            format: 'plain-text',
            length: 'medium'
        });

        const result = await summarizer.summarize(text);
        summarizer.destroy();
        return result;
    } catch {
        return null;
    }
}

/**
 * Simple extractive summarization using sentence scoring.
 * Scores sentences by word frequency (TF) and position.
 */
function extractiveSummarize(text, count = 5) {
    // Split into sentences
    const sentences = text
        .replace(/([.!?])\s+/g, '$1\n')
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 20 && s.length < 500);

    if (sentences.length <= count) return sentences.join(' ');

    // Build word frequency map
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const freq = {};
    for (const w of words) {
        freq[w] = (freq[w] || 0) + 1;
    }

    // Score each sentence
    const scored = sentences.map((s, i) => {
        const sWords = s.toLowerCase().split(/\W+/).filter(w => w.length > 3);
        let score = 0;
        for (const w of sWords) {
            score += freq[w] || 0;
        }
        // Normalize by sentence length
        score = score / Math.max(sWords.length, 1);
        // Position bonus (first and last sentences are more important)
        if (i < 3) score *= 1.3;
        if (i === sentences.length - 1) score *= 1.1;
        return { sentence: s, score, index: i };
    });

    // Take top N by score, then sort by original position
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, count);
    top.sort((a, b) => a.index - b.index);

    return top.map(t => t.sentence).join(' ');
}
