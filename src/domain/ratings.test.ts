import { describe, it, expect } from 'vitest';
import { bayesian, caseSimilarity, freshness } from './ratings';
import { availability } from './availability';
import { renderCalendar } from '../../supabase/functions/_shared/ical';
describe('availability and trustworthy ratings', () => {
    it('uses the supplied prior, without inflating small samples', () => { expect(bayesian(2, 5, 4.4)).toBeCloseTo(4.5); expect(bayesian(80, 4.8, 4.4)).toBeCloseTo(4.755555); expect(bayesian(0, 0, 4.4)).toBe(4.4); });
    it('decays old reviews and applies case, age and format weights', () => { expect(freshness(365)).toBeCloseTo(Math.exp(-1)); expect(freshness(-20)).toBe(1); expect(caseSimilarity('autism','speech',3,false)).toBeCloseTo(.175); expect(caseSimilarity('speech','learning',1,true)).toBe(0); expect(caseSimilarity('unknown','unknown',0,true)).toBe(0); });
    it('keeps the common rating when comparable evidence is absent', () => { expect(bayesian(0, 0, 4.76, 5)).toBe(4.76); });
    it('separates near, later and occupied slots using actual availability', () => {
        const now = Date.parse('2026-11-14T09:00:00Z');
        const slot = { id:'s', specialist_id:'p', starts_at:new Date(now+86400000).toISOString(), ends_at:new Date(now+86400000+2700000).toISOString(),service:'Встреча',price:100,available:true };
        expect(availability([slot],'p',now).rank).toBe(0); expect(availability([{...slot,starts_at:new Date(now+9*86400000).toISOString()}],'p',now).rank).toBe(1); expect(availability([{...slot,available:false}],'p',now).rank).toBe(2);
    });
    it('exports cancellations and safely escapes and folds calendar text', () => {
        const result=renderCalendar([{id:'id',starts_at:'2026-11-14T09:00:00Z',ends_at:'2026-11-14T09:45:00Z',updated_at:'2026-11-14T08:00:00Z',status:'cancelled',title:'Приём, центр; текст\nBEGIN:VEVENT '+ 'я'.repeat(90)}]);
        expect(result).toContain('STATUS:CANCELLED'); expect(result).toContain('DTSTART:20261114T090000Z'); expect(result).toContain('Приём\\, центр\\; текст\\nBEGIN:'); expect(result.match(/\r\nBEGIN:VEVENT/g)).toHaveLength(1); expect(result.split('\r\n').every(line=>new TextEncoder().encode(line).length<=75)).toBe(true);
    });
});
