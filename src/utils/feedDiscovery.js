/**
 * Feed Discovery Service
 * Tries to find RSS/Atom feeds from a given URL.
 * Uses a CORS proxy to fetch the HTML content.
 */

const CORS_PROXY = "https://api.allorigins.win/get?url=";

/**
 * Validates if a URL is likely an RSS feed
 */
const isFeedUrl = (url) => {
    return /\.(xml|rss|atom)$/i.test(url) || /feed|rss|atom/i.test(url);
};

/**
 * Discover feeds from a website URL
 * @param {string} url - The website URL (e.g., "https://techcrunch.com")
 * @returns {Promise<Array>} - List of found feeds { title, url }
 */
export const discoverFeeds = async (url) => {
    try {
        if (!url) return [];

        // 1. If URL looks like a feed already, return it
        if (isFeedUrl(url)) {
            return [{ title: "Custom Feed", url }];
        }

        // 2. Fetch HTML via Proxy
        const encodedUrl = encodeURIComponent(url);
        const response = await fetch(`${CORS_PROXY}${encodedUrl}`);
        const data = await response.json();

        if (!data.contents) {
            throw new Error("Failed to fetch page content");
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, "text/html");
        const feeds = [];

        // 3. Look for <link> tags
        // <link rel="alternate" type="application/rss+xml" href="..." />
        const linkTags = doc.querySelectorAll('link[rel="alternate"][type="application/rss+xml"], link[rel="alternate"][type="application/atom+xml"]');

        linkTags.forEach(tag => {
            let feedUrl = tag.getAttribute('href');
            const title = tag.getAttribute('title') || "RSS Feed";

            // Resolve relative URLs
            if (feedUrl && !feedUrl.startsWith('http')) {
                const baseUrl = new URL(url);
                feedUrl = new URL(feedUrl, baseUrl.origin).href;
            }

            if (feedUrl) {
                feeds.push({ title, url: feedUrl });
            }
        });

        // 4. Fallback: Check common paths if no tags found
        if (feeds.length === 0) {
            const commonPaths = ['/feed', '/rss', '/rss.xml', '/atom.xml'];
            const baseUrl = new URL(url).origin;

            // We return these as "potential" feeds - the aggregator will try them
            commonPaths.forEach(path => {
                feeds.push({
                    title: `Possible Feed (${path})`,
                    url: `${baseUrl}${path}`
                });
            });
        }

        return feeds;

    } catch (error) {
        console.error("Feed discovery failed:", error);
        return [];
    }
};
