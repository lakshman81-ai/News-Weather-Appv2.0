/**
 * Proxy Manager - Handles failover between multiple RSS proxies
 * Industry Best Practice: Round-robin with failure tracking
 */
import logStore from '../utils/logStore.js';

const PROXIES = [
    {
        name: 'rss2json',
        url: 'https://api.rss2json.com/v1/api.json',
        format: (feedUrl) => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`,
        parse: async (response) => {
            const data = await response.json();
            if (data.status === 'ok') {
                return {
                    title: data.feed?.title,
                    items: data.items || []
                };
            }
            throw new Error('rss2json status not ok');
        }
    },
    {
        name: 'codetabs',
        url: 'https://api.codetabs.com/v1/proxy',
        format: (feedUrl) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(feedUrl)}`,
        parse: async (response) => {
            const text = await response.text();
            if (!text) throw new Error('Empty response from codetabs');
            return parseXML(text);
        }
    },
    {
        name: 'allorigins',
        url: 'https://api.allorigins.win/get',
        format: (feedUrl) => `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`,
        parse: async (response) => {
            const data = await response.json();
            if (!data.contents) throw new Error('No content from allorigins');
            return parseXML(data.contents);
        }
    }
];

function parseXML(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
        throw new Error('XML Parsing Error');
    }

    const feedTitle = xmlDoc.querySelector("channel > title")?.textContent || "Unknown Source";

    // Select all items
    const items = Array.from(xmlDoc.querySelectorAll("item")).map(node => {
        // Basic Fields
        const title = node.querySelector("title")?.textContent;
        const link = node.querySelector("link")?.textContent;
        const pubDate = node.querySelector("pubDate")?.textContent;
        const description = node.querySelector("description")?.textContent;
        const guid = node.querySelector("guid")?.textContent;

        // Author
        const author = node.querySelector("author")?.textContent ||
                       node.querySelector("dc\\:creator")?.textContent;

        // Image Extraction helpers to match normalizeItem expectations

        // Enclosure
        const enclosureNode = node.querySelector("enclosure");
        const enclosure = enclosureNode ? {
            url: enclosureNode.getAttribute("url"),
            type: enclosureNode.getAttribute("type")
        } : null;

        // Media Content
        const mediaContentNode = node.querySelector("media\\:content") || node.querySelector("content");
        const mediaContent = mediaContentNode ? {
            url: mediaContentNode.getAttribute("url")
        } : null;

        // Media Thumbnail
        const mediaThumbnailNode = node.querySelector("media\\:thumbnail") || node.querySelector("thumbnail");
        const thumbnail = mediaThumbnailNode ? mediaThumbnailNode.getAttribute("url") : null;

        return {
            title,
            link,
            pubDate,
            description,
            guid,
            author,
            enclosure,
            "media:content": mediaContent,
            thumbnail
        };
    });

    return {
        title: feedTitle,
        items
    };
}

class ProxyManager {
    constructor() {
        this.currentIndex = 0;
        this.failureCounts = new Map();
        this.lastSuccess = new Map();
    }

    async fetchViaProxy(feedUrl) {
        const maxAttempts = PROXIES.length;
        let lastError = null;

        // Try strictly for the number of proxies available
        // We start from currentIndex to enable round-robin load balancing/failover persistence
        for (let i = 0; i < maxAttempts; i++) {
            const index = (this.currentIndex + i) % maxAttempts;
            const proxy = PROXIES[index];

            try {
                // console.log(`[ProxyManager] Attempting via ${proxy.name} for ${feedUrl}`);

                const proxyUrl = proxy.format(feedUrl);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000); // Increased timeout to 8s

                let response;
                try {
                    response = await fetch(proxyUrl, { signal: controller.signal });
                } finally {
                    clearTimeout(timeoutId);
                }

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const result = await proxy.parse(response);

                if (!result || !result.items || result.items.length === 0) {
                    throw new Error('No items returned');
                }

                // Success!
                this.failureCounts.set(proxy.name, 0);
                this.lastSuccess.set(proxy.name, Date.now());
                this.currentIndex = index;
                logStore.info('proxy', `${proxy.name} OK (${result.items.length} items)`);

                return result;

            } catch (error) {
                console.warn(`[ProxyManager] ${proxy.name} failed for ${feedUrl}:`, error.message);
                lastError = error;

                const failures = (this.failureCounts.get(proxy.name) || 0) + 1;
                this.failureCounts.set(proxy.name, failures);
            }
        }

        logStore.error('proxy', `All proxies failed: ${lastError?.message}`);
        throw new Error(`All proxies failed. Last error: ${lastError?.message}`);
    }

    getProxyHealth() {
        return PROXIES.map(proxy => ({
            name: proxy.name,
            failures: this.failureCounts.get(proxy.name) || 0,
            lastSuccess: this.lastSuccess.get(proxy.name) || null
        }));
    }
}

export const proxyManager = new ProxyManager();
