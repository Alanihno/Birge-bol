import { useQuery } from '@tanstack/react-query';
import { useApp } from './app-context';
import { useCare } from './care-api';
import { mode, supabase } from './backend';
import { bayesian, caseSimilarity, freshness } from '../domain/ratings';
import type { Rating } from '../domain/ratings';
import type { CareState } from '../domain/care';
const ageValue = (age: string) => ({ '2–3': 2.5, '4–5': 4.5, '6–8': 7, '9–12': 10.5 }[age] || 0);
export function demoRatings(state: CareState, age: string, group: string, format: string): Rating[] {
    const reviews = state.reviews.filter(review => review.status === 'verified' && review.visit_verified);
    const weight = (review: typeof reviews[number]) => freshness((Date.now() - Date.parse(review.created_at || new Date().toISOString())) / 86400000);
    return state.specialists.map(specialist => {
        const pool = reviews.filter(review => review.is_demo === specialist.is_demo);
        const mean = (rows: typeof reviews, w = weight) => rows.reduce((sum, review) => sum + review.contact * w(review), 0) / rows.reduce((sum, review) => sum + w(review), 0);
        const c = pool.length ? mean(pool) : null;
        const own = pool.filter(review => review.specialist_id === specialist.id);
        const overall = c === null ? null : bayesian(own.length, own.length ? mean(own) : c, c);
        const w = (review: typeof reviews[number]) => review.case_consent && review.case_age ? weight(review) * caseSimilarity(group, review.case_group || 'unknown', ageValue(age) - review.case_age, format === 'any' || format === review.visit_format) : 0;
        const count = own.filter(review => w(review) > 0).length;
        const effective = own.reduce((sum, review) => sum + w(review), 0);
        return { specialist_id: specialist.id, overall, similar: overall === null || !effective ? overall : bayesian(effective, mean(own, w), overall, 5), review_count: own.length, similar_count: count, effective_similar: effective, platform_mean: c };
    });
}
export function useRatings() {
    const app = useApp(), care = useCare();
    const child = app.role === 'parent' ? app.data.children.find(child => child.id === app.activeChild.id) : undefined;
    const format = child?.format || 'any';
    return useQuery<Rating[]>({ queryKey: ['ratings', mode, app.userId, child?.id, child?.case_group, child?.age, format], enabled: !!app.userId && (mode !== 'demo' || !!care.data), staleTime: 15000, refetchInterval: 30000, refetchOnWindowFocus: true, queryFn: async () => {
        if (mode === 'demo') return demoRatings(care.data!, child?.age || '', child?.case_group || 'unknown', format);
        const result = await supabase!.rpc('care_ratings', { p_child_id: child?.id || null, p_format: format });
        if (result.error) throw Error('Не удалось обновить рейтинги');
        return result.data as unknown as Rating[];
    } });
}
