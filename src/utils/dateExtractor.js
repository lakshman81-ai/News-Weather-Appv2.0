/**
 * 5-Layer Date Extraction Engine for Up Ahead.
 *
 * Layers (tried in order, first match wins):
 *   1. ISO / numeric dates  — "2026-02-14", "14/02/2026"
 *   2. Named dates          — "February 14", "Feb 14, 2026", "14th February"
 *   3. Date ranges          — "Feb 10 to Feb 24", "10-24 February"
 *   4. Relative dates       — "tomorrow", "next week", "this Friday"
 *   5. Deadline detection   — "ends Feb 12", "last date March 1"
 *
 * All functions return { start: Date, end: Date | null, type: string } or null.
 */

const MONTHS = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11
};

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function monthNum(str) {
    return MONTHS[str.toLowerCase().slice(0, 3)] ?? null;
}

function inferYear(month, day, ref) {
    const d = new Date(ref.getFullYear(), month, day);
    // If the inferred date is more than 30 days in the past, push to next year
    if (d < ref && (ref - d) > 30 * 86400000) {
        d.setFullYear(d.getFullYear() + 1);
    }
    return d;
}

// Layer 1: ISO and numeric dates
function extractISO(text, ref) {
    // ISO: 2026-02-14
    const iso = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
    if (iso) {
        return { start: new Date(+iso[1], +iso[2] - 1, +iso[3]), end: null, type: 'iso' };
    }
    // DD/MM/YYYY or DD-MM-YYYY
    const dmy = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
    if (dmy) {
        return { start: new Date(+dmy[3], +dmy[2] - 1, +dmy[1]), end: null, type: 'numeric' };
    }
    return null;
}

// Layer 2: Named dates — "February 14", "14th Feb", "Feb 14, 2026"
function extractNamed(text, ref) {
    const monthNames = Object.keys(MONTHS).filter(m => m.length > 2).join('|');
    // "Month Day[, Year]"
    const re1 = new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:[,\\s]+(\\d{4}))?\\b`, 'i');
    const m1 = text.match(re1);
    if (m1) {
        const mo = monthNum(m1[1]);
        const day = +m1[2];
        const yr = m1[3] ? +m1[3] : null;
        const d = yr ? new Date(yr, mo, day) : inferYear(mo, day, ref);
        return { start: d, end: null, type: 'named' };
    }
    // "Day[th] Month [Year]"
    const re2 = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNames})(?:\\s+(\\d{4}))?\\b`, 'i');
    const m2 = text.match(re2);
    if (m2) {
        const mo = monthNum(m2[2]);
        const day = +m2[1];
        const yr = m2[3] ? +m2[3] : null;
        const d = yr ? new Date(yr, mo, day) : inferYear(mo, day, ref);
        return { start: d, end: null, type: 'named' };
    }
    return null;
}

// Layer 3: Date ranges — "Feb 10 to Feb 24", "10-24 February"
function extractRange(text, ref) {
    const monthNames = Object.keys(MONTHS).filter(m => m.length > 2).join('|');
    // "Month Day to/- Month Day"
    const re1 = new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})\\s*(?:to|–|-|through)\\s*(${monthNames})\\s+(\\d{1,2})\\b`, 'i');
    const m1 = text.match(re1);
    if (m1) {
        return {
            start: inferYear(monthNum(m1[1]), +m1[2], ref),
            end: inferYear(monthNum(m1[3]), +m1[4], ref),
            type: 'range'
        };
    }
    // "Month Day to Day" (same month)
    const re2 = new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})\\s*(?:to|–|-|through)\\s*(\\d{1,2})\\b`, 'i');
    const m2 = text.match(re2);
    if (m2) {
        const mo = monthNum(m2[1]);
        return {
            start: inferYear(mo, +m2[2], ref),
            end: inferYear(mo, +m2[3], ref),
            type: 'range'
        };
    }
    // "Day-Day Month"
    const re3 = new RegExp(`\\b(\\d{1,2})\\s*(?:to|–|-)\\s*(\\d{1,2})\\s+(${monthNames})\\b`, 'i');
    const m3 = text.match(re3);
    if (m3) {
        const mo = monthNum(m3[3]);
        return {
            start: inferYear(mo, +m3[1], ref),
            end: inferYear(mo, +m3[2], ref),
            type: 'range'
        };
    }
    return null;
}

// Layer 4: Relative dates — "tomorrow", "this Friday", "next week"
function extractRelative(text, ref) {
    const lower = text.toLowerCase();

    if (/\btomorrow\b/.test(lower)) {
        const d = new Date(ref);
        d.setDate(d.getDate() + 1);
        return { start: d, end: null, type: 'relative' };
    }
    if (/\btoday\b/.test(lower)) {
        return { start: new Date(ref), end: null, type: 'relative' };
    }

    // "next N days/weeks"
    const nextN = lower.match(/\bnext\s+(\d+)\s+(day|week)s?\b/);
    if (nextN) {
        const n = +nextN[1];
        const unit = nextN[2] === 'week' ? 7 : 1;
        const end = new Date(ref);
        end.setDate(end.getDate() + n * unit);
        return { start: new Date(ref), end, type: 'relative' };
    }

    // "next week"
    if (/\bnext week\b/.test(lower)) {
        const start = new Date(ref);
        start.setDate(start.getDate() + (7 - start.getDay() + 1)); // next Monday
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return { start, end, type: 'relative' };
    }

    // "this/next Friday"
    for (let i = 0; i < DAYS.length; i++) {
        const dayRe = new RegExp(`\\b(?:this|next|coming)\\s+${DAYS[i]}\\b`, 'i');
        if (dayRe.test(text)) {
            const d = new Date(ref);
            let diff = (i - d.getDay() + 7) % 7;
            if (diff === 0) diff = 7; // if today is that day, assume next occurrence
            d.setDate(d.getDate() + diff);
            return { start: d, end: null, type: 'relative' };
        }
    }

    // "this weekend"
    if (/\bthis weekend\b/.test(lower)) {
        const sat = new Date(ref);
        sat.setDate(sat.getDate() + (6 - sat.getDay() + 7) % 7);
        const sun = new Date(sat);
        sun.setDate(sun.getDate() + 1);
        return { start: sat, end: sun, type: 'relative' };
    }

    return null;
}

// Layer 5: Deadline detection — "ends Feb 12", "last date March 1", "deadline"
function extractDeadline(text, ref) {
    const monthNames = Object.keys(MONTHS).filter(m => m.length > 2).join('|');
    const deadlineRe = new RegExp(
        `\\b(?:ends?|last date|deadline|valid (?:till|until)|expires?|before)\\s+(?:on\\s+)?` +
        `(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:[,\\s]+(\\d{4}))?\\b`,
        'i'
    );
    const m = text.match(deadlineRe);
    if (m) {
        const mo = monthNum(m[1]);
        const day = +m[2];
        const yr = m[3] ? +m[3] : null;
        const d = yr ? new Date(yr, mo, day) : inferYear(mo, day, ref);
        return { start: new Date(ref), end: d, type: 'deadline' };
    }
    return null;
}

/**
 * Main entry point. Extracts dates from text using all 5 layers.
 * @param {string} text - Article title + description
 * @param {Date|string} [pubDate] - Publication date for context
 * @returns {{ start: Date, end: Date|null, type: string } | null}
 */
export function extractDate(text, pubDate) {
    if (!text) return null;
    const ref = pubDate ? new Date(pubDate) : new Date();
    if (isNaN(ref.getTime())) return null;

    return (
        extractISO(text, ref) ||
        extractNamed(text, ref) ||
        extractRange(text, ref) ||
        extractRelative(text, ref) ||
        extractDeadline(text, ref)
    );
}

/**
 * Expand a date result into an array of date keys (YYYY-MM-DD) for multi-day events.
 * @param {{ start: Date, end: Date|null }} dateResult
 * @param {number} [maxDays=14] - Safety cap
 * @returns {string[]}
 */
export function expandDateKeys(dateResult, maxDays = 14) {
    if (!dateResult?.start) return [];
    const keys = [];
    const start = new Date(dateResult.start);
    start.setHours(0, 0, 0, 0);
    const end = dateResult.end ? new Date(dateResult.end) : new Date(start);
    end.setHours(0, 0, 0, 0);

    let d = new Date(start);
    while (d <= end && keys.length < maxDays) {
        keys.push(d.toISOString().slice(0, 10));
        d.setDate(d.getDate() + 1);
    }
    return keys;
}
