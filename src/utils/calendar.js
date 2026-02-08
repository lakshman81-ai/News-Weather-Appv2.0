export const downloadCalendarEvent = (title, description) => {
    // Current time as start, duration 1 hour (default)
    const now = new Date();
    const start = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const end = new Date(now.getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const eventText = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${title}
DESCRIPTION:${description}
DTSTART:${start}
DTEND:${end}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([eventText], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
};
