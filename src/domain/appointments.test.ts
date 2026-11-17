import { describe, it, expect } from 'vitest';
import { sortAppointments } from './appointments';
import type { CareAppointment } from './care';

const visit = (id: string, day: number, status='confirmed') => ({ id, starts_at: `2026-11-${day}T09:00:00Z`, ends_at: `2026-11-${day}T10:00:00Z`, status } as CareAppointment);
describe('diary appointment order', () => {
 it('puts the 15th above the 17th without mutating the source', () => {
  const rows = [visit('later',17),visit('near',15,'pending')];
  expect(sortAppointments(rows,Date.parse('2026-11-14')) .map(a=>a.id)).toEqual(['near','later']);
  expect(rows[0].id).toBe('later');
 });
 it('keeps closed and historical visits after upcoming visits, recent history first', () => {
  const rows = [visit('cancelled',19,'cancelled'),visit('old',11,'completed'),visit('next',17),visit('recent',13,'completed'),visit('missed',12,'pending')];
  expect(sortAppointments(rows,Date.parse('2026-11-14')).map(a=>a.id)).toEqual(['next','cancelled','recent','missed','old']);
 });
});
