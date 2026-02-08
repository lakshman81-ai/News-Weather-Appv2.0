/**
 * Client-side article text extractor.
 * Uses allOrigins CORS proxy + DOMParser to extract article body.
 */

const PROXY = 'https://api.allorigins.win/raw?url=';

/**
 * Fetch and extract article text from a URL.
 * @param {string} url - Article URL
 * @returns {Promise<string>} Extracted text (may be empty)
 */
export async function extractArticleText(url) {
    if (!url) return '';

    try {
        const proxyUrl = PROXY + encodeURIComponent(url);
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
        if (!res.ok) return '';

        const html = await res.text();
        return parseArticleFromHTML(html);
    } catch {
        return '';
    }
}

/**
 * Parse article body from raw HTML using common article selectors.
 */
function parseArticleFromHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove scripts, styles, ads, nav
    doc.querySelectorAll('script, style, nav, footer, header, aside, .ad, .advertisement, .social-share, .comments')
        .forEach(el => el.remove());

    // Try article-specific selectors first
    const selectors = [
        'article',
        '[itemprop="articleBody"]',
        '.article-body',
        '.story-content',
        '.article-content',
        '.post-content',
        '.entry-content',
        '.td-post-content',
        '#article-body',
        '.story-element',
        'main'
    ];

    for (const sel of selectors) {
        const el = doc.querySelector(sel);
        if (el) {
            const text = el.textContent.trim();
            if (text.length > 200) return text.slice(0, 5000);
        }
    }

    // Fallback: largest <p> cluster
    const paragraphs = Array.from(doc.querySelectorAll('p'));
    const text = paragraphs
        .map(p => p.textContent.trim())
        .filter(t => t.length > 40)
        .join('\n\n');

    return text.slice(0, 5000);
}
