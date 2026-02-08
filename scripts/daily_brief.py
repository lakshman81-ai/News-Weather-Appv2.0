import os
import json
import time
import requests
import feedparser
from bs4 import BeautifulSoup
from datetime import datetime
import traceback

# Optional imports — graceful degradation
try:
    import trafilatura
    HAS_TRAFILATURA = True
except ImportError:
    HAS_TRAFILATURA = False
    print("INFO: trafilatura not installed. Article body extraction will be skipped.")

try:
    from sumy.parsers.plaintext import PlaintextParser
    from sumy.nlp.tokenizers import Tokenizer
    from sumy.summarizers.lex_rank import LexRankSummarizer
    HAS_SUMY = True
except ImportError:
    HAS_SUMY = False
    print("INFO: sumy not installed. Extractive summarization will use fallback.")

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OUTPUT_FILE = "public/data/epaper_data.json"
MAX_ARTICLES_PER_SECTION = 15
BODY_FETCH_LIMIT = 5  # Only fetch body text for top N articles per section

# Configure Gemini
model = None
if GEMINI_API_KEY and HAS_GENAI:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')
    except Exception as e:
        print(f"Error configuring Gemini: {e}")
elif not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY not found. Will use free summarization fallback.")

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}


def clean_text(text):
    if not text:
        return ""
    return text.strip().replace('\n', ' ').replace('  ', ' ')


# ---------------------------------------------------------------------------
# Article Body Extraction (trafilatura)
# ---------------------------------------------------------------------------

def fetch_article_body(url, timeout=15):
    """Fetch article body text using trafilatura (best-in-class extraction)."""
    if not HAS_TRAFILATURA:
        return ""
    try:
        downloaded = trafilatura.fetch_url(url)
        if downloaded:
            text = trafilatura.extract(downloaded, include_comments=False,
                                       include_tables=False, favor_recall=True)
            return text or ""
    except Exception as e:
        print(f"  Body extraction failed for {url}: {e}")
    return ""


# ---------------------------------------------------------------------------
# 3-Tier Summarization
# ---------------------------------------------------------------------------

def summarize_extractive_sumy(text, sentence_count=5):
    """Tier 2: Extractive summarization using Sumy LexRank (no API key needed)."""
    if not HAS_SUMY or not text or len(text) < 100:
        return None
    try:
        parser = PlaintextParser.from_string(text, Tokenizer("english"))
        summarizer = LexRankSummarizer()
        sentences = summarizer(parser.document, sentence_count)
        return " ".join(str(s) for s in sentences)
    except Exception as e:
        print(f"  Sumy summarization failed: {e}")
    return None


def summarize_headline_bullets(articles):
    """Tier 3: Simple bullet-point summary from headlines (always works)."""
    if not articles:
        return None
    lines = []
    for a in articles[:10]:
        title = a.get('title', '').strip()
        if title:
            lines.append(f"• {title}")
    return "\n".join(lines) if lines else None


def summarize_section(source_name, section_name, articles):
    """
    3-tier summarization:
      Tier 1: Gemini API (if key available)
      Tier 2: Sumy LexRank on article bodies (free, offline)
      Tier 3: Headline bullet points (always works)
    """
    if not articles:
        return {"error": "No articles to summarize"}

    # --- Tier 1: Gemini ---
    if model:
        result = _summarize_gemini(source_name, section_name, articles)
        if result and 'summary' in result:
            return result

    # --- Tier 2: Sumy on concatenated bodies ---
    body_texts = [a.get('body', '') for a in articles if a.get('body')]
    if body_texts:
        combined = "\n\n".join(body_texts[:5])
        if len(combined) > 200:
            sumy_summary = summarize_extractive_sumy(combined, sentence_count=8)
            if sumy_summary:
                return {"summary": sumy_summary, "method": "extractive"}

    # --- Tier 3: Headline bullets ---
    bullets = summarize_headline_bullets(articles)
    if bullets:
        return {"summary": bullets, "method": "headlines"}

    return {"error": "No summary generated"}


def _summarize_gemini(source_name, section_name, articles):
    """Gemini-based summarization (requires API key)."""
    article_list = "\n".join([f"- {a['title']}" for a in articles[:15]])
    is_tamil = source_name in ["DINAMANI", "DAILY_THANTHI"]

    base_prompt = f"""You are a professional news editor. Summarize the following news headlines from {source_name} - {section_name} into a concise, insightful daily briefing.

Headlines:
{article_list}
"""
    if is_tamil:
        prompt = base_prompt + """
REQUIREMENTS:
1. Provide the summary in TWO languages: English and Tamil.
2. Format: 3-4 bullet points highlighting the most important stories.
3. Style: Professional, objective, and journalistic.
4. SEPARATE the English summary and Tamil summary with "|||".

OUTPUT FORMAT:
<English Summary>
|||
<Tamil Summary>
"""
    else:
        prompt = base_prompt + """
REQUIREMENTS:
1. Language: English ONLY. (Translate if source is not English).
2. Format: 3-4 bullet points highlighting the most important stories.
3. Style: Professional, objective, and journalistic.
4. No introductory text.
"""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if is_tamil and "|||" in text:
            parts = text.split("|||")
            return {"summary": parts[0].strip(), "summary_ta": parts[1].strip()}
        return {"summary": text}
    except Exception as e:
        print(f"  Gemini error for {source_name}/{section_name}: {e}")
        err = str(e)
        if "429" in err:
            return {"error": "Quota Exceeded"}
        if "403" in err:
            return {"error": "Invalid API Key"}
        return None  # Fall through to Tier 2


def translate_titles_batch(articles):
    """Translates Tamil titles to English using Gemini."""
    if not model or not articles:
        return
    titles = [a['title'] for a in articles]
    titles_text = "\n".join([f"{i+1}. {t}" for i, t in enumerate(titles)])

    prompt = f"""Translate the following Tamil news headlines to English.
Maintain the original meaning and journalistic style.
Return ONLY the translated titles, one per line, numbered exactly as input.

Headlines:
{titles_text}
"""
    try:
        response = model.generate_content(prompt)
        for line in response.text.strip().split('\n'):
            parts = line.split('.', 1)
            if len(parts) == 2:
                try:
                    idx = int(parts[0].strip()) - 1
                    if 0 <= idx < len(articles):
                        articles[idx]['title_en'] = parts[1].strip()
                except ValueError:
                    continue
    except Exception as e:
        print(f"  Translation failed: {e}")


# ---------------------------------------------------------------------------
# Scrapers — Multi-Strategy
# ---------------------------------------------------------------------------

def fetch_the_hindu():
    """Multi-strategy scraper for The Hindu's Today's Paper."""
    print("Fetching The Hindu (Multi-Strategy)...")
    url = "https://www.thehindu.com/todays-paper/"
    sections = []

    try:
        response = requests.get(url, headers=HEADERS, timeout=30)
        soup = BeautifulSoup(response.content, 'html.parser')

        # Strategy 1: Section-based parsing (broader selectors)
        section_els = soup.select('[class*="section"], [class*="page-"]')

        # Strategy 2: All links that look like articles
        all_links = soup.select(
            'a[href*="/todays-paper/"], '
            'a[href*="/news/"], '
            'a[href*="/opinion/"], '
            'a[href*="/business/"], '
            'a[href*="/sport/"], '
            '.story-card a, .element a, '
            'h3 a, h2 a, .title a, '
            '.story-card-news a, .headline a'
        )

        seen_links = set()
        current_section = {"page": "Front Page", "articles": []}
        sections.append(current_section)

        for a_tag in all_links:
            title = clean_text(a_tag.get_text())
            href = a_tag.get('href', '')
            if not title or len(title) < 10 or not href:
                continue
            if not href.startswith('http'):
                href = "https://www.thehindu.com" + href
            if href in seen_links:
                continue
            seen_links.add(href)

            # Detect section from URL path
            section_name = _detect_hindu_section(href)
            if section_name != current_section["page"] and current_section["articles"]:
                current_section = {"page": section_name, "articles": []}
                sections.append(current_section)
            elif section_name != current_section["page"]:
                current_section["page"] = section_name

            current_section['articles'].append({"title": title, "link": href})

        # Strategy 3: RSS fallback if nothing worked
        if sum(len(s['articles']) for s in sections) < 5:
            print("  Hindu scraping sparse, supplementing with RSS...")
            rss_sections = _fetch_hindu_rss()
            sections.extend(rss_sections)

    except Exception as e:
        print(f"  Hindu scraping failed: {e}")
        return _fetch_hindu_rss()

    # Deduplicate and limit
    result = []
    for s in sections:
        if s['articles']:
            s['articles'] = s['articles'][:MAX_ARTICLES_PER_SECTION]
            result.append(s)
    return result


def _detect_hindu_section(url):
    """Infer section name from Hindu URL path."""
    if '/opinion/' in url:
        return 'Opinion'
    if '/business/' in url:
        return 'Business'
    if '/sport/' in url:
        return 'Sport'
    if '/entertainment/' in url:
        return 'Entertainment'
    if '/national/' in url:
        return 'National'
    if '/international/' in url:
        return 'International'
    if '/cities/' in url:
        return 'Cities'
    if '/science/' in url or '/technology/' in url:
        return 'Sci-Tech'
    return 'Front Page'


def _fetch_hindu_rss():
    """RSS fallback for The Hindu with multiple section feeds."""
    feeds = [
        {"page": "Front Page", "url": "https://www.thehindu.com/news/national/feeder/default.rss"},
        {"page": "Opinion", "url": "https://www.thehindu.com/opinion/feeder/default.rss"},
        {"page": "Business", "url": "https://www.thehindu.com/business/feeder/default.rss"},
        {"page": "Cities", "url": "https://www.thehindu.com/news/cities/feeder/default.rss"},
    ]
    return fetch_from_feeds(feeds)


def fetch_indian_express():
    print("Fetching Indian Express (RSS)...")
    feeds = [
        {"page": "Front Page", "url": "https://indianexpress.com/feed/"},
        {"page": "India", "url": "https://indianexpress.com/section/india/feed/"},
        {"page": "World", "url": "https://indianexpress.com/section/world/feed/"},
        {"page": "Opinion", "url": "https://indianexpress.com/section/opinion/editorials/feed/"},
        {"page": "Business", "url": "https://indianexpress.com/section/business/feed/"},
    ]
    return fetch_from_feeds(feeds)


def fetch_dinamani():
    print("Fetching Dinamani (Google News RSS)...")
    feeds = [
        {"page": "Latest News", "url": "https://news.google.com/rss/search?q=site:dinamani.com+when:1d&hl=ta&gl=IN&ceid=IN:ta"},
        {"page": "Tamil Nadu", "url": "https://news.google.com/rss/search?q=site:dinamani.com+Tamil+Nadu+when:1d&hl=ta&gl=IN&ceid=IN:ta"}
    ]
    return fetch_from_feeds(feeds)


def fetch_daily_thanthi():
    print("Fetching Daily Thanthi (Google News RSS)...")
    feeds = [
        {"page": "Latest News", "url": "https://news.google.com/rss/search?q=site:dailythanthi.com+when:1d&hl=ta&gl=IN&ceid=IN:ta"},
        {"page": "Cinema", "url": "https://news.google.com/rss/search?q=site:dailythanthi.com+cinema+when:1d&hl=ta&gl=IN&ceid=IN:ta"}
    ]
    return fetch_from_feeds(feeds)


def fetch_from_feeds(feed_list):
    sections = []
    for f in feed_list:
        try:
            d = feedparser.parse(f['url'])
            articles = []
            for entry in d.entries[:MAX_ARTICLES_PER_SECTION]:
                articles.append({
                    "title": entry.title,
                    "link": entry.link
                })
            if articles:
                sections.append({"page": f['page'], "articles": articles})
        except Exception as e:
            print(f"  Feed error {f['url']}: {e}")
    return sections


# ---------------------------------------------------------------------------
# Main Workflow
# ---------------------------------------------------------------------------

def main():
    print(f"Starting Daily Brief Aggregation at {datetime.now().isoformat()}")

    data = {
        "lastUpdated": datetime.now().isoformat(),
        "sources": {}
    }

    sources = {
        "THE_HINDU": fetch_the_hindu,
        "INDIAN_EXPRESS": fetch_indian_express,
        "DINAMANI": fetch_dinamani,
        "DAILY_THANTHI": fetch_daily_thanthi
    }

    for key, fetch_func in sources.items():
        try:
            sections = fetch_func()
            if not sections:
                print(f"  WARNING: No sections found for {key}")

            print(f"  Processing {key} ({sum(len(s['articles']) for s in sections)} articles)...")
            is_tamil = key in ["DINAMANI", "DAILY_THANTHI"]

            for section in sections:
                # 1. Fetch article bodies for top articles (trafilatura)
                for article in section['articles'][:BODY_FETCH_LIMIT]:
                    body = fetch_article_body(article['link'])
                    if body:
                        article['body'] = body[:3000]  # Cap at 3KB per article
                    time.sleep(0.5)  # Be polite

                # 2. Summarize (3-tier)
                time.sleep(1)
                result = summarize_section(key, section['page'], section['articles'])
                if result:
                    if 'error' in result:
                        section['error'] = result['error']
                    else:
                        section['summary'] = result.get('summary')
                        if result.get('method'):
                            section['summary_method'] = result['method']
                        if 'summary_ta' in result:
                            section['summary_ta'] = result.get('summary_ta')

                # 3. Translate Tamil titles
                if is_tamil and model:
                    try:
                        time.sleep(1)
                        translate_titles_batch(section['articles'])
                    except Exception as e:
                        print(f"    Translation failed for {key}: {e}")

                # 4. Strip body text from output to save JSON size
                # (keep only title, link, title_en)
                for article in section['articles']:
                    article.pop('body', None)

            data["sources"][key] = sections

        except Exception as e:
            print(f"  CRITICAL error processing {key}: {e}")
            traceback.print_exc()
            data["sources"][key] = []

    # Write output
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    total_articles = sum(
        len(a) for s in data['sources'].values()
        for sec in s for a in [sec.get('articles', [])]
    )
    total_summaries = sum(
        1 for s in data['sources'].values()
        for sec in s if sec.get('summary')
    )
    print(f"Done! {total_articles} articles, {total_summaries} summaries saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
