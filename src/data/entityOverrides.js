/**
 * Entity-based classification overrides
 * If article contains these entities, immediately classify to specified section
 */
export const ENTITY_OVERRIDES = {
    // Politicians → India section
    'Narendra Modi': 'india',
    'Rahul Gandhi': 'india',
    'Amit Shah': 'india',
    'Arvind Kejriwal': 'india',
    'Mamata Banerjee': 'india',
    'Droupadi Murmu': 'india',
    'Jagdeep Dhankhar': 'india',
    'Nirmala Sitharaman': 'india',
    'S. Jaishankar': 'india',
    'Rajnath Singh': 'india',
    'Nitin Gadkari': 'india',
    'Mallikarjun Kharge': 'india',

    // Tamil Nadu Politicians → Chennai section (assuming most TN politics relevant to Chennai/State)
    'MK Stalin': 'chennai',
    'Edappadi Palaniswami': 'chennai',
    'K. Annamalai': 'chennai',
    'Annamalai': 'chennai',
    'Udhayanidhi Stalin': 'chennai',
    'Thol. Thirumavalavan': 'chennai',
    'Seeman': 'chennai',
    'Kamal Haasan': 'entertainment', // He is both, but ent news more likely unless explicitly political context, handling in classifier logic?
                                     // Actually, simple override prioritizes one. Let's stick to their primary fame or most frequent news category.
                                     // For Kamal Haasan, let's keep him in Entertainment as defaults unless "party" or "election" keywords present.
                                     // But overrides are absolute. I'll remove Kamal from here to let keywords decide,
                                     // or set him to entertainment as that's 80% of news.

    // Celebrities → Entertainment
    'Rajinikanth': 'entertainment',
    'Vijay': 'entertainment', // Actor Vijay
    'Thalapathy Vijay': 'entertainment',
    'Ajith Kumar': 'entertainment',
    'Suriya': 'entertainment',
    'Shah Rukh Khan': 'entertainment',
    'Salman Khan': 'entertainment',
    'Alia Bhatt': 'entertainment',
    'Deepika Padukone': 'entertainment',
    'Taylor Swift': 'entertainment',
    'Beyonce': 'entertainment',

    // Sports Teams & Players → Sports
    'Chennai Super Kings': 'sports',
    'CSK': 'sports',
    'Mumbai Indians': 'sports',
    'Royal Challengers Bangalore': 'sports',
    'RCB': 'sports',
    'Indian Cricket Team': 'sports',
    'Virat Kohli': 'sports',
    'MS Dhoni': 'sports',
    'Rohit Sharma': 'sports',
    'Ravindra Jadeja': 'sports',
    'R Ashwin': 'sports',
    'Jasprit Bumrah': 'sports',
    'Lionel Messi': 'sports',
    'Cristiano Ronaldo': 'sports',
    'Novak Djokovic': 'sports',
    'Rafael Nadal': 'sports',
    'Carlos Alcaraz': 'sports',
    'PV Sindhu': 'sports',
    'Neeraj Chopra': 'sports',
    'R Praggnanandhaa': 'sports',
    'D Gukesh': 'sports',

    // Tech Companies → Technology
    'OpenAI': 'technology',
    'Tesla': 'technology',
    'SpaceX': 'technology',
    'Nvidia': 'technology',
    'Sam Altman': 'technology',
    'Mark Zuckerberg': 'technology',
    'Sundar Pichai': 'technology',
    'Satya Nadella': 'technology',
    'Tim Cook': 'technology',

    // Business
    'Gautam Adani': 'business',
    'Mukesh Ambani': 'business',
    'Ratan Tata': 'business',
    'N Chandrasekaran': 'business',
    'Uday Kotak': 'business',
    'Nifty 50': 'business',
    'Sensex': 'business'
};
