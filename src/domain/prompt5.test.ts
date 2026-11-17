import { describe, expect, it } from 'vitest';
import { youtubeId, canonicalYouTube } from '../lib/youtube';
import { suggestions, matchesSearch } from './search';
import { clinicAnalytics } from './clinic-analytics';
import { demoSpecialists } from './data';
import { transition } from '../components/mascot/mascot-states';
import { safeError } from '../lib/safe-error';
import { dynamicVisitPath } from './visit-qr';
import type { CareAppointment } from './care';
describe('Prompt 5 security and functional boundaries',()=>{
 it('opens dynamic visit links only on approved origins and never accepts another origin',()=>{const path='/v/'+ 'a'.repeat(32)+'/123456';expect(dynamicVisitPath('https://birge-bol.vercel.app'+path,'https://birge-bol.vercel.app')).toBe(path);expect(dynamicVisitPath('https://evil.test'+path,'https://birge-bol.vercel.app')).toBeNull();expect(dynamicVisitPath('javascript:alert(1)','https://birge-bol.vercel.app')).toBeNull();});
 it('only accepts exact YouTube hosts, HTTPS, and an eleven-character video ID',()=>{
  for(const url of ['https://youtu.be/abcdefghijk','https://www.youtube.com/watch?v=abcdefghijk','https://youtube.com/shorts/abcdefghijk'])expect(youtubeId(url)).toBe('abcdefghijk');
  for(const url of ['javascript:alert(1)','http://youtube.com/watch?v=abcdefghijk','https://youtube.com.evil.test/watch?v=abcdefghijk','https://user:pass@youtube.com/watch?v=abcdefghijk','https://youtu.be/abcdefghijk/more','<iframe src=x>'])expect(youtubeId(url)).toBeNull();
  expect(canonicalYouTube('https://youtu.be/abcdefghijk?t=12')).toBe('https://www.youtube.com/watch?v=abcdefghijk');
 });
 it('uses local synonyms, spelling corrections, district prefixes and a bounded list',()=>{
  expect(suggestions('  ЛОГО  ',demoSpecialists).some(s=>s.label==='Логопед')).toBe(true);
  expect(suggestions('Бостан',demoSpecialists)[0].value).toBe('Бостандыкский');
  expect(suggestions('ребёнок не говорит',demoSpecialists)[0].value).toBe('speech');
  expect(matchesSearch(demoSpecialists[0],'логопет')).toBe(true);expect(suggestions('ло',demoSpecialists).length).toBeLessThanOrEqual(7);
 });
 it('does not count cancellation or an unconfirmed payment as collected revenue',()=>{
  const base={starts_at:'2026-11-17T08:00:00Z',ends_at:'2026-11-17T09:00:00Z',specialist_id:'s',payment_amount:15000};
  const rows=[{...base,id:'a',status:'confirmed',payment_state:'claimed'},{...base,id:'b',status:'cancelled',payment_state:'confirmed',payment_confirmed_at:'2026-11-17T08:30:00Z'}] as CareAppointment[];
  const stats=clinicAnalytics(rows,[],'2026-11-17','2026-11-17');expect(stats.received).toBe(15000);expect(stats.expected).toBe(15000);expect(stats.cancelled).toBe(1);expect(stats.occupancy).toBeNull();expect(stats.paid).toBe(1);
 });
 it('prevents lower priority mascot reactions from interrupting errors',()=>{expect(transition('offline','waving')).toBe('offline');expect(transition('loading','error')).toBe('error');expect(transition('error','idle',true)).toBe('idle');});
 it('never renders SQL, keys or internal IDs as a user error',()=>{for(const error of ['select secret from vault.decrypted_secrets','function private.secret(uuid) failed','23514 constraint check failed','f0000000-0000-4000-8000-000000000001'])expect(safeError(Error(error))).not.toContain(error);expect(safeError(Error('Invalid login credentials'))).toContain('Неверный email');});
});
