export function phoneNumber(value: string) {
    if (!/^[+\d\s().-]*$/.test(value)) return '';
    const digits = value.replace(/\D/g, '');
    return /^[1-9]\d{9,14}$/.test(digits) ? digits : '';
}
export function telegramName(value: string) {
    const name = value.trim().replace(/^https:\/\/t\.me\//i, '').replace(/^@/, '').replace(/\/$/, '');
    return /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(name) && !['share','login','proxy','joinchat','addstickers'].includes(name.toLowerCase()) ? name : '';
}
export function clinicContacts(raw: string): { note: string; whatsapp: string; telegram: string; website?: string } {
    try { const value = JSON.parse(raw); if (value && typeof value === 'object') { let website='';try { const url=new URL(value.website);if(url.protocol==='https:'&&!url.username&&!url.password)website=url.href; }catch{/* Missing website. */}return { note: typeof value.note === 'string' ? value.note : '', whatsapp: typeof value.whatsapp === 'string' ? value.whatsapp : '', telegram: typeof value.telegram === 'string' ? value.telegram : '',...(website?{website}:{}) }; } } catch { /* Legacy plain text contacts. */ }
    return { note: raw, whatsapp: '', telegram: '' };
}
export const whatsappLink = (phone: string, text: string) => 'https://wa.me/' + phoneNumber(phone) + '?text=' + encodeURIComponent(text);
export const telegramLink = (username: string, text: string) => telegramName(username) ? 'https://t.me/' + telegramName(username) + '?text=' + encodeURIComponent(text) : 'https://t.me/share/url?url=https%3A%2F%2Fbirge-bol.vercel.app&text=' + encodeURIComponent(text);
