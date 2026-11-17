import type { CareAppointment } from './care';

export const isUpcomingAppointment = (a: CareAppointment, now = Date.now()) => !['cancelled', 'expired', 'completed'].includes(a.status) && Date.parse(a.ends_at || a.starts_at) >= now;

/** Upcoming visits first; closed or past visits form a newest-first history. */
export function sortAppointments(rows: CareAppointment[], now = Date.now()) {
    return [...rows].sort((a, b) => {
        const nextA = isUpcomingAppointment(a, now), nextB = isUpcomingAppointment(b, now);
        if (nextA !== nextB) return nextA ? -1 : 1;
        const diff = Date.parse(a.starts_at) - Date.parse(b.starts_at);
        return (nextA ? diff : -diff) || a.id.localeCompare(b.id);
    });
}
