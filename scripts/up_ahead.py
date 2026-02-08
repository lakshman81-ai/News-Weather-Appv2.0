import os
import json
import time
import requests
import feedparser
import google.generativeai as genai
from datetime import datetime, timedelta
import traceback

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OUTPUT_FILE = "public/data/up_ahead.json"

# Configure Gemini
model = None
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')
    except Exception as e:
        print(f"Error configuring Gemini: {e}")
else:
    print("WARNING: GEMINI_API_KEY not found. Up Ahead generation will be skipped/mocked.")

def fetch_rss_feeds():
    """
    Fetches headlines from various entertainment and city feeds.
    """
    feeds = [
        "https://www.thehindu.com/entertainment/feeder/default.rss",
        "https://www.thehindu.com/news/cities/chennai/feeder/default.rss",
        "https://www.hindustantimes.com/feeds/rss/entertainment/tamil-cinema/rssfeed.xml",
        "https://www.hindustantimes.com/feeds/rss/entertainment/bollywood/rssfeed.xml",
        "https://timesofindia.indiatimes.com/rssfeeds/1081479906.cms", # TOI Entertainment
        "https://www.livemint.com/rss/news" # General news for holidays/bank closures sometimes
    ]

    all_items = []
    print("Fetching RSS feeds...")
    for url in feeds:
        try:
            d = feedparser.parse(url)
            for entry in d.entries[:10]: # Top 10 from each
                all_items.append(f"- {entry.title} ({entry.link})")
        except Exception as e:
            print(f"Error fetching {url}: {e}")

    return "\n".join(all_items)

def generate_up_ahead_data(headlines):
    """
    Uses Gemini to generate the Up Ahead JSON.
    """
    if not model:
        return None

    today_str = datetime.now().strftime("%A, %d %B %Y")

    prompt = f"""
    You are an intelligent lifestyle and events editor.
    Today is {today_str}.

    I have a list of recent news headlines (below).
    Your task is to generate a structured JSON output for an "Up Ahead" dashboard.

    Sources Headlines:
    {headlines}

    Instructions:
    1. **Analyze Headlines**: Look for movie releases, events, festivals, or important dates mentioned in the headlines for the NEXT 7-14 DAYS.
    2. **Internal Knowledge**: Supplement the news with your own knowledge of:
       - Major Movie Releases (Tamil, Hindi, English) scheduled for this week/next week.
       - Upcoming Holidays, Festivals, or Bank Closures in India/Tamil Nadu.
       - Major Sporting Events (Cricket, Football) this week.
    3. **"Plan My Week"**: Create a fun, curated 7-day plan (starting Today).

    Output JSON Format (Strict JSON only, no markdown blocks):
    {{
        "timeline": [
            {{
                "date": "YYYY-MM-DD",
                "dayLabel": "Monday (Today)",
                "items": [
                    {{
                        "id": "unique_id",
                        "type": "movie|event|festival|alert|sport",
                        "title": "Leo Release",
                        "subtitle": "In Theaters",
                        "description": "Short 1-line description.",
                        "tags": ["Tamil", "Action"]
                    }}
                ]
            }}
            // Generate for next 7 days. If a day has no specific event, suggest a generic activity (e.g. "Try a new restaurant").
        ],
        "sections": {{
            "movies": [ {{ "title": "...", "releaseDate": "...", "language": "..." }} ],
            "festivals": [ {{ "title": "...", "date": "..." }} ],
            "alerts": [ {{ "text": "Heavy Rain expected on Tuesday", "severity": "high|medium|low" }} ] // Infer from headlines or general knowledge
        }},
        "weekly_plan": {{
            "monday": "...",
            "tuesday": "...",
            "wednesday": "...",
            "thursday": "...",
            "friday": "...",
            "saturday": "...",
            "sunday": "..."
        }}
    }}
    """

    try:
        print("Generating Up Ahead data with Gemini...")
        response = model.generate_content(prompt)
        text = response.text.strip()

        # Clean markdown if present
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]

        data = json.loads(text)
        return data
    except Exception as e:
        print(f"Error generating data: {e}")
        traceback.print_exc()
        return None

def main():
    print("Starting Up Ahead Script...")

    headlines = fetch_rss_feeds()

    # Retry logic or Fallback
    data = generate_up_ahead_data(headlines)

    if not data:
        print("Failed to generate data. Creating empty fallback.")
        data = {"timeline": [], "sections": {}, "error": "Generation Failed"}

    # Add metadata
    data["lastUpdated"] = datetime.now().isoformat()

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Success! Data saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
