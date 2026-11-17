const key = 'bb-public-explanations-v1';
type Entry = { meaning: string; expires: number };
export function cachedExplanation(term: string): string | null {
    try { const entry = (JSON.parse(localStorage.getItem(key) || '{}') as Record<string, Entry>)[term]; return entry && entry.expires > Date.now() && typeof entry.meaning === 'string' ? entry.meaning : null; } catch { return null; }
}
export function cacheExplanation(term: string, meaning: string) {
    try { const cache = JSON.parse(localStorage.getItem(key) || '{}') as Record<string, Entry>; const valid = Object.entries(cache).filter(([, entry]) => entry.expires > Date.now()).slice(-49); localStorage.setItem(key, JSON.stringify({ ...Object.fromEntries(valid), [term]: { meaning, expires: Date.now() + 86400000 } })); } catch { /* Cache availability never blocks explanations. */ }
}
