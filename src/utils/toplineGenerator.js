/**
 * Generates random "Topline" content:
 * - Flashback (On this day)
 * - Trending (Keywords from news)
 * - Quick Fact
 * - Weather Insight
 */

const QUICK_FACTS = [
    "Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still edible.",
    "Octopuses have three hearts. Two pump blood to the gills, while one pumps it to the rest of the body.",
    "Bananas are berries, but strawberries aren't.",
    "The Eiffel Tower can be 15 cm taller during the summer due to thermal expansion.",
    "A group of flamingos is called a 'flamboyance'.",
    "Wombat poop is cube-shaped.",
    "The shortest war in history lasted 38 minutes between Britain and Zanzibar in 1896.",
    "Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid of Giza."
];

const HISTORY_EVENTS = [
    "On this day, history was made.", // Placeholder, ideally specific to date
    "Remembering the pioneers of the digital age.",
    "Today marks a moment of innovation in history."
];

function getTrending(newsData) {
    // Extract words from headlines
    const words = [];
    const stopWords = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'dead', 'kills', 'says', 'india', 'world']);

    // Aggregate all headlines
    const allNews = [
        ...(newsData.world || []),
        ...(newsData.india || []),
        ...(newsData.tech || [])
    ];

    if (allNews.length === 0) return null;

    allNews.forEach(item => {
        if (!item.title) return;
        const clean = item.title.replace(/[^\w\s]/gi, '').toLowerCase().split(/\s+/);
        clean.forEach(w => {
            if (w.length > 3 && !stopWords.has(w)) words.push(w);
        });
    });

    // Count frequency
    const freq = {};
    words.forEach(w => freq[w] = (freq[w] || 0) + 1);

    // Sort
    const sorted = Object.entries(freq).sort((a,b) => b[1] - a[1]);
    const top3 = sorted.slice(0, 3).map(x => x[0]);

    if (top3.length === 0) return null;

    return {
        type: 'TRENDING',
        icon: '🔥',
        text: `Trending now: #${top3.join(', #')}`
    };
}

function getWeatherInsight(weatherData) {
    if (!weatherData || Object.keys(weatherData).length === 0) return null;

    // Pick first available city
    const city = Object.keys(weatherData)[0];
    const data = weatherData[city];

    if (!data || !data.current) return null;

    const temp = data.current.temp;
    const cond = data.current.condition.toLowerCase();

    let text = "";
    if (temp > 35) text = `It's a scorcher today at ${temp}°C. Stay hydrated!`;
    else if (temp < 20) text = `Cooler vibes today at ${temp}°C.`;
    else if (cond.includes('rain')) text = "Rainy skies today. Don't forget your umbrella.";
    else text = `Currently ${temp}°C and ${cond}. A pleasant day ahead?`;

    return {
        type: 'WEATHER INSIGHT',
        icon: '🌤️',
        text: text
    };
}

export function generateTopline(newsData, weatherData) {
    const options = [];

    // 1. Fact
    options.push({
        type: 'QUICK FACT',
        icon: '💡',
        text: QUICK_FACTS[Math.floor(Math.random() * QUICK_FACTS.length)]
    });

    // 2. Trending (if news available)
    const trending = getTrending(newsData);
    if (trending) options.push(trending);

    // 3. Weather (if available)
    const weather = getWeatherInsight(weatherData);
    if (weather) options.push(weather);

    // 4. Flashback (Generic for now)
    options.push({
        type: 'FLASHBACK',
        icon: '🕰️',
        text: HISTORY_EVENTS[Math.floor(Math.random() * HISTORY_EVENTS.length)]
    });

    // Random Pick
    return options[Math.floor(Math.random() * options.length)];
}
