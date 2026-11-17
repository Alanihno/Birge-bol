import type { Slot } from './care';
export function availability(slots: Slot[], specialist: string, now = Date.now()) {
    const free = slots.filter(slot => slot.specialist_id === specialist && slot.available && Date.parse(slot.starts_at) > now).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    const soon = free.filter(slot => Date.parse(slot.starts_at) <= now + 7 * 86400000);
    return { rank: soon.length ? 0 : free.length ? 1 : 2, count: soon.length, next: free[0] || null };
}
