/* localized-copy */
import { tr, useLocale } from './i18n';
import { useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, X } from 'lucide-react';
const key = 'bb-compare-v3';
const listeners = new Set<() => void>();
const snapshot = () => sessionStorage.getItem(key) || '[]';
function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function useComparison() { const raw = useSyncExternalStore(subscribe, snapshot); let ids: string[] = []; try {
    ids = JSON.parse(raw);
}
catch { /* reset invalid selection */ } function toggle(id: string) { const next = ids.includes(id) ? ids.filter(x => x !== id) : ids.length < 3 ? [...ids, id] : ids; sessionStorage.setItem(key, JSON.stringify(next)); listeners.forEach(fn => fn()); } return { ids, toggle }; }
export function CompareButton({ id }: {
    id: string;
}) { useLocale(); const { ids, toggle } = useComparison(); return <button className={`chip compare-button ${ids.includes(id) ? 'selected' : ''}`} aria-pressed={ids.includes(id)} disabled={ids.length >= 3 && !ids.includes(id)} onClick={() => toggle(id)}><ArrowLeftRight size={15}/>{tr(ids.includes(id) ? 'В сравнении' : 'Сравнить')}</button>; }
export function ComparisonBar() { useLocale(); const { ids } = useComparison(); return ids.length ? <div className="comparison-bar"><span>{tr("Выбрано ")}{tr(ids.length)}{tr("из 3")}</span><Link className={`btn primary ${ids.length < 2 ? 'disabled-link' : ''}`} aria-disabled={ids.length < 2} to={ids.length >= 2 ? '/compare?ids=' + ids.join(',') : '#'} onClick={e => { if (ids.length < 2)
    e.preventDefault(); }}>{tr("Сравнить ")}<ArrowLeftRight size={15}/></Link><button aria-label={tr("Очистить сравнение")} onClick={() => { sessionStorage.setItem(key, '[]'); listeners.forEach(fn => fn()); }}><X size={18}/></button></div> : null; }
