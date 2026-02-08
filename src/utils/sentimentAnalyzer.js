// Lightweight Sentiment Analyzer (Browser Compatible)
// Replaces the 'sentiment' node package to avoid production build crashes.

const AFINN_DATA = {
    // Positive
    "abandon": -2, "accident": -2, "alert": -1, "ambitious": 2, "asset": 2,
    "active": 1, "advance": 2, "agree": 1, "amazing": 4, "approve": 2,
    "award": 3, "awesome": 4, "bad": -3, "bailout": -2, "beautiful": 3,
    "benefit": 2, "best": 3, "boost": 1, "breakthrough": 3, "bright": 1,
    "bull": 2, "bullish": 2, "buy": 1, "calm": 2, "cancel": -1,
    "care": 2, "celebrate": 3, "challenge": -1, "champion": 2, "cheap": -1,
    "clean": 2, "collapse": -2, "climb": 1, "comfort": 2, "commit": 1,
    "confidence": 2, "conflict": -2, "congrats": 2, "congratulate": 2,
    "cool": 1, "correct": 1, "crash": -2, "crisis": -3, "criticize": -2,
    "danger": -2, "dead": -3, "debt": -2, "decline": -1, "defeat": -2,
    "deficit": -2, "denied": -2, "depression": -2, "destroy": -3, "devastate": -3,
    "difficult": -1, "disaster": -2, "disease": -1, "dispute": -2, "doubt": -1,
    "down": -1, "drop": -1, "dump": -1, "earn": 1, "earnings": 1,
    "ease": 2, "easy": 1, "effective": 2, "efficient": 2, "emergency": -2,
    "encourage": 2, "enjoy": 2, "error": -2, "excellent": 3, "cite": 2,
    "expand": 1, "fail": -2, "failure": -2, "fake": -3, "fall": -1,
    "fantastic": 4, "fear": -2, "fight": -1, "fine": 2, "fraud": -4,
    "free": 1, "fresh": 1, "fun": 4, "gain": 2, "good": 3,
    "great": 3, "growth": 2, "happy": 3, "hard": -1, "harm": -2,
    "hate": -3, "healthy": 2, "help": 2, "hero": 2, "high": 1,
    "hope": 2, "hurt": -2, "ignore": -1, "ill": -2, "improve": 2,
    "increase": 1, "infect": -2, "inflation": -2, "injury": -2, "innovate": 1,
    "innovative": 2, "inspire": 2, "intelligent": 2, "invest": 1, "joke": 2,
    "joy": 3, "jump": 1, "kill": -3, "lack": -2, "lag": -1,
    "lead": 1, "leader": 1, "legal": 1, "lie": -2, "like": 2,
    "loss": -3, "love": 3, "low": -1, "luck": 3, "lucky": 3,
    "market": 1, "merger": 2, "miss": -1, "mistake": -2, "murder": -3,
    "negative": -2, "nice": 3, "outperform": 2, "outstanding": 5, "panic": -3,
    "perfect": 3, "plunge": -2, "poor": -2, "positive": 2, "praise": 3,
    "problem": -2, "profit": 2, "progress": 2, "promise": 1, "proud": 2,
    "protect": 1, "rally": 2, "recession": -2, "record": 2, "recover": 1,
    "reject": -1, "reliable": 2, "relief": 1, "rescue": 2, "resolve": 2,
    "restore": 1, "reward": 2, "rich": 2, "risk": -2, "safe": 1,
    "save": 2, "scandal": -3, "scare": -2, "secure": 2, "sell": -1,
    "shares": 1, "shortage": -2, "sick": -2, "significant": 1, "smart": 1,
    "smile": 2, "solid": 2, "solve": 1, "spark": 1, "stable": 2,
    "stock": 1, "stop": -1, "strength": 2, "strong": 2, "success": 2,
    "suffer": -2, "surge": 1, "surprise": 2, "sweet": 2, "tech": 1,
    "terrible": -3, "terrified": -3, "threat": -2, "top": 2, "tough": -1,
    "tragedy": -2, "trouble": -2, "trust": 1, "ugly": -3, "uncertain": -1,
    "unemployment": -2, "unfair": -2, "up": 1, "upset": -2, "urgent": -1,
    "useful": 2, "value": 1, "victory": 3, "violation": -2, "violence": -3,
    "volatile": -1, "vulnerable": -2, "weak": -2, "wealth": 3, "win": 4,
    "winner": 4, "wonderful": 4, "worry": -3, "worst": -3, "wow": 4,
    "wrong": -2, "yes": 1
};

/**
 * Tokenize text into words
 */
const tokenize = (text) => {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove punctuation
        .split(/\s+/)
        .filter(w => w.length > 0);
};

/**
 * Analyze sentiment of text (title or description)
 * Returns: { score, comparative, label }
 */
export const analyzeSentiment = (text) => {
    if (!text || text.trim().length === 0) {
        return { score: 0, comparative: 0, label: 'neutral' };
    }

    const tokens = tokenize(text);
    let score = 0;
    let wordsHit = 0;

    tokens.forEach(token => {
        if (AFINN_DATA[token]) {
            score += AFINN_DATA[token];
            wordsHit++;
        }
    });

    // Normalize
    const comparative = tokens.length > 0 ? score / tokens.length : 0;

    let label = 'neutral';
    if (comparative > 0.05) label = 'positive';
    else if (comparative < -0.05) label = 'negative';

    return {
        score,
        comparative,
        label
    };
};

/**
 * Boost sentiment weight for tech/finance/market articles
 */
export const boostForTechSentiment = (sentimentLabel, keywords = []) => {
    const techKeywords = [
        'tech', 'market', 'stock', 'surge', 'growth', 'ai', 'innovation',
        'startup', 'ipo', 'crypto', 'bitcoin', 'blockchain', 'earnings'
    ];

    const isTechContext = keywords.some(k =>
        techKeywords.some(tk => k.toLowerCase().includes(tk))
    );

    if (isTechContext && sentimentLabel === 'positive') return 1.3;
    if (isTechContext && sentimentLabel === 'negative') return 0.8;
    return 1.0;
};

/**
 * Analyze both title and description, return weighted average
 */
export const analyzeArticleSentiment = (title, description) => {
    const titleSent = analyzeSentiment(title);
    const descSent = analyzeSentiment(description);

    // Weight title more heavily (60% vs 40%)
    const avgComparative = (titleSent.comparative * 0.6) + (descSent.comparative * 0.4);

    let label = 'neutral';
    if (avgComparative > 0.05) label = 'positive';
    else if (avgComparative < -0.05) label = 'negative';

    return {
        label,
        comparative: avgComparative,
        titleSentiment: titleSent,
        descriptionSentiment: descSent
    };
};
