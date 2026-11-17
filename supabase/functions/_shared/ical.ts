type Event = { id: string; starts_at: string; ends_at: string; updated_at: string; status: string; title: string };
const stamp = (value: string) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
function fold(line: string) {
    const encoder = new TextEncoder(); let output = '', chunk = '', length = 0;
    for (const character of line) { const bytes = encoder.encode(character).length; if (length + bytes > 73) { output += chunk + '\r\n '; chunk = ''; length = 1; } chunk += character; length += bytes; }
    return output + chunk;
}
export function renderCalendar(events: Event[]) {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Birge Bol//Appointments//RU', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Birge Bol'];
    for (const event of events) {
        if (![event.starts_at,event.ends_at,event.updated_at].every(value => Number.isFinite(Date.parse(value)))) continue;
        lines.push('BEGIN:VEVENT', 'UID:' + escape(event.id) + '@birge-bol', 'DTSTAMP:' + stamp(event.updated_at), 'LAST-MODIFIED:' + stamp(event.updated_at), 'DTSTART:' + stamp(event.starts_at), 'DTEND:' + stamp(event.ends_at), 'SUMMARY:' + escape(event.title), 'STATUS:' + (['cancelled','expired'].includes(event.status) ? 'CANCELLED' : event.status === 'pending' ? 'TENTATIVE' : 'CONFIRMED'), 'END:VEVENT');
    }
    lines.push('END:VCALENDAR'); return lines.map(fold).join('\r\n') + '\r\n';
}
