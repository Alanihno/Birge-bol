export const caseGroups = { unknown: 'Не указывать', speech: 'Речь / задержка речи', autism: 'РАС (по информации семьи)', learning: 'Обучение', attention: 'Внимание', other: 'Другой запрос' };
export type CaseGroup = keyof typeof caseGroups;
export type Rating = { specialist_id: string; overall: number | null; similar: number | null; review_count: number; similar_count: number; effective_similar: number; platform_mean: number | null };
export const freshness = (days: number) => Math.exp(-Math.max(0, days) / 365);
export function bayesian(v: number, r: number, anchor: number, prior = 10) { return (v * r + prior * anchor) / (v + prior); }
export function caseSimilarity(a: string, b: string, ageDifference: number, sameFormat: boolean) {
    const condition = a === 'unknown' || b === 'unknown' ? 0 : a === b ? 1 : ['autism', 'speech'].includes(a) && ['autism', 'speech'].includes(b) ? 0.5 : 0;
    return condition * (Math.abs(ageDifference) <= 2 ? 1 : Math.abs(ageDifference) <= 4 ? 0.5 : 0.2) * (sameFormat ? 1 : 0.7);
}
