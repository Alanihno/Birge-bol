import { describe,it,expect } from 'vitest';
import { roleGraph,searchGraph } from './navigation-graph';
import { paymentDeadline } from './payments';
describe('role-scoped knowledge graph and hold deadlines',()=>{
 it('connects navigation, keywords and database key metadata without exposing child data',()=>{const graph=roleGraph('parent');expect(searchGraph(graph,'как оплатить')[0].id).toBe('payments');expect(searchGraph(graph,'ребенок').some(node=>node.id==='family')).toBe(true);expect(graph.edges.some(edge=>edge.key==='slot_id → schedule_slots.id')).toBe(true);expect(roleGraph('clinic').nodes.some(node=>node.id==='children_data')).toBe(false);expect(graph.nodes.find(node=>node.id==='payments')?.route).toBe('/diary');});
 it('caps a normal hold at 24 hours and six hours before a later session',()=>{const now=Date.parse('2026-11-14T05:00:00Z');expect(paymentDeadline('2026-11-18T05:00:00Z',now)).toBe('2026-11-15T05:00:00.000Z');expect(paymentDeadline('2026-11-16T00:00:00Z',now)).toBe('2026-11-15T05:00:00.000Z');});
 it('uses short holds today/tomorrow, never beyond the session start',()=>{const now=Date.parse('2026-11-14T05:00:00Z');expect(paymentDeadline('2026-11-15T10:00:00Z',now)).toBe('2026-11-14T07:00:00.000Z');expect(paymentDeadline('2026-11-14T06:00:00Z',now)).toBe('2026-11-14T06:00:00.000Z');});
});
