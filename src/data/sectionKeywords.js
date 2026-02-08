/**
 * Section classification keywords
 * Each section has a list of keywords/phrases to match against article title+description
 */
export const SECTION_KEYWORDS = {
    world: [
        'UN', 'NATO', 'United Nations', 'international', 'embassy',
        'foreign', 'global', 'war', 'peace talks', 'summit', 'G7', 'G20',
        'EU', 'European Union', 'Middle East', 'Ukraine', 'Russia',
        'Gaza', 'Israel', 'Palestine', 'Hamas', 'Hezbollah', 'Iran',
        'China', 'USA', 'UK', 'Biden', 'Trump', 'Putin', 'Zelenskyy',
        'Netanyahu', 'diplomacy', 'geopolitical', 'sanctions', 'treaty',
        'United States', 'Britain', 'France', 'Germany', 'Australia',
        'Canada', 'Japan', 'South Korea', 'North Korea'
    ],

    india: [
        'Delhi', 'New Delhi', 'Modi', 'BJP', 'Congress', 'Parliament', 'Supreme Court',
        'India', 'Indian', 'Lok Sabha', 'Rajya Sabha', 'PM', 'President',
        'RBI', 'central government', 'nationwide', 'union minister',
        'Amit Shah', 'Rahul Gandhi', 'AAP', 'Kejriwal', 'Mamata Banerjee',
        'Trinamool', 'CPM', 'Elections', 'ECI', 'Election Commission',
        'CBI', 'ED', 'Enforcement Directorate', 'UPSC', 'NEET', 'census',
        'aadhaar', 'pan card', 'railways', 'vande bharat', 'isro',
        'chandrayaan', 'aditya-l1', 'gaganyaan', 'defence', 'army', 'navy', 'air force'
    ],

    chennai: [
        'Chennai', 'Madras', 'Marina Beach', 'TN Assembly', 'MTC',
        'CMDA', 'Anna University', 'Kauvery Hospital', 'Apollo Chennai',
        'Tambaram', 'Egmore', 'T Nagar', 'Adyar', 'Velachery', 'Guindy',
        'Mylapore', 'Triplicane', 'Chromepet', 'Pallavaram', 'OMR', 'ECR',
        'Old Mahabalipuram Road', 'East Coast Road', 'Koyambedu', 'Anna Nagar',
        'Besant Nagar', 'Thiruvanmiyur', 'IIT Madras', 'Loyola College',
        'Presidency College', 'Ripon Building', 'Greater Chennai Corporation',
        'GCC', 'Chennai Metro', 'CMRL', 'Central Station', 'Egmore Station',
        'Meenambakkam', 'Chennai Airport', 'Nungambakkam', 'Kodambakkam'
    ],

    trichy: [
        'Trichy', 'Tiruchirappalli', 'Srirangam', 'BHEL Trichy',
        'NIT Trichy', 'Rock Fort', 'Kaveri', 'Cauvery', 'Thanjavur',
        'Delta districts', 'Samayapuram', 'Manapparai', 'Thiruverumbur',
        'Lalgudi', 'Musiri', 'Thuraiyur', 'Pudukkottai', 'Karur',
        'Perambalur', 'Ariyalur', 'Kallanai', 'Mukkombu', 'Butterfly Park',
        'Tiruchirapalli'
    ],

    business: [
        'stock', 'market', 'economy', 'GDP', 'inflation', 'RBI',
        'Sensex', 'Nifty', 'shares', 'BSE', 'NSE', 'earnings',
        'revenue', 'profit', 'loss', 'IPO', 'merger', 'acquisition',
        'startup', 'funding', 'investment', 'corporate', 'CEO', 'CFO',
        'bank', 'finance', 'fiscal', 'monetary', 'repo rate', 'tax',
        'GST', 'income tax', 'customs', 'export', 'import', 'trade',
        'rupee', 'dollar', 'gold', 'silver', 'oil', 'crude', 'brent',
        'crypto', 'bitcoin', 'ethereum', 'blockchain', 'mutual fund',
        'SIP', 'dividend', 'quarterly results', 'Adani', 'Ambani', 'Tata',
        'Reliance', 'Infosys', 'TCS', 'Wipro', 'HDFC', 'ICICI', 'SBI'
    ],

    technology: [
        'AI', 'tech', 'technology', 'Google', 'Apple', 'Microsoft',
        'software', 'hardware', 'cyber', 'crypto', 'blockchain',
        'iPhone', 'Android', 'app', 'cloud', 'data', 'algorithm',
        'machine learning', 'artificial intelligence', 'ChatGPT', 'OpenAI',
        'Gemini', 'LLM', 'neural network', 'robotics', 'automation',
        '5G', '6G', 'telecom', 'semiconductor', 'chip', 'processor',
        'Intel', 'AMD', 'Nvidia', 'Samsung', 'OnePlus', 'Xiaomi',
        'cybersecurity', 'hacker', 'malware', 'ransomware', 'virus',
        'SpaceX', 'NASA', 'satellite', 'rocket', 'drone', 'electric vehicle',
        'EV', 'Tesla', 'Elon Musk', 'Mark Zuckerberg', 'Sundar Pichai',
        'Satya Nadella', 'Tim Cook'
    ],

    entertainment: [
        'film', 'movie', 'actor', 'actress', 'director', 'box office',
        'OTT', 'Netflix', 'Amazon Prime', 'Disney+', 'cinema', 'theatre',
        'Kollywood', 'Bollywood', 'Hollywood', 'music', 'album', 'concert',
        'award', 'Oscar', 'Emmy', 'Grammy', 'celebrity', 'release', 'trailer',
        'teaser', 'review', 'blockbuster', 'star', 'superstar', 'hero',
        'heroine', 'villain', 'script', 'screenplay', 'cinematography',
        'Rajinikanth', 'Kamal Haasan', 'Vijay', 'Ajith', 'Suriya',
        'Dhanush', 'Vikram', 'Nayanthara', 'Trisha', 'Anirudh', 'AR Rahman',
        'Shah Rukh Khan', 'Salman Khan', 'Aamir Khan', 'Deepika Padukone',
        'Alia Bhatt', 'Ranbir Kapoor', 'Karan Johar', 'Tollywood', 'Mollywood'
    ],

    sports: [
        'cricket', 'football', 'IPL', 'Olympics', 'match', 'championship',
        'FIFA', 'World Cup', 'player', 'coach', 'team', 'goal', 'wicket',
        'run', 'tennis', 'badminton', 'hockey', 'trophy', 'medal',
        'CSK', 'MI', 'RCB', 'stadium', 'tournament', 'league', 'series',
        'test match', 'ODI', 'T20', 'century', 'half-century', 'hat-trick',
        'penalty', 'corner', 'free kick', 'grand slam', 'Wimbledon',
        'US Open', 'French Open', 'Australian Open', 'F1', 'Formula 1',
        'racing', 'driver', 'athlete', 'gold medal', 'silver medal',
        'bronze medal', 'BCCI', 'ICC', 'Virat Kohli', 'Rohit Sharma',
        'Dhoni', 'MS Dhoni', 'Messi', 'Ronaldo', 'Neymar', 'Mbappe'
    ]
};
