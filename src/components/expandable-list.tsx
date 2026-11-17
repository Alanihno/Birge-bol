import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useLocale } from '../lib/i18n';

/** Keep collapsed forms mounted so expanding a list cannot erase a receipt or draft. */
export function ExpandableList<T extends { id: string }>({ items, renderItem, initial = 3, step = 3, selectedId, revealKey, className = 'stack', label }: {
    items: readonly T[];
    renderItem: (item: T, index: number) => ReactNode;
    initial?: number;
    step?: number;
    selectedId?: string;
    revealKey?: string;
    className?: string;
    label?: string;
}) {
    const language = useLocale(), id = useId();
    const target = selectedId ? `${selectedId}:${revealKey || ''}` : undefined;
    const [expansion, setExpansion] = useState({ limit: initial, target, collapsed: false });
    const selectedIndex = selectedId ? items.findIndex(item => item.id === selectedId) : -1;
    // A link from the payment inbox must reveal its exact appointment immediately.
    const sameTarget = expansion.target === target;
    const linked = sameTarget && expansion.collapsed ? 0 : selectedIndex + 1;
    const shown = Math.min(items.length, Math.max(initial, sameTarget ? expansion.limit : initial, linked));
    if (!items.length) return null;
    const kk = language === 'kk', more = Math.min(step, items.length - shown);
    return <div className="expandable-list" aria-label={label}>
        <div id={id} className={className}>
            {items.map((item, index) => <div className="expandable-item" hidden={index >= shown} key={item.id}>{renderItem(item, index)}</div>)}
        </div>
        {items.length > initial && <div className="list-controls">
            <span>{kk ? `${items.length} ішінен ${shown} көрсетілді` : `Показано ${shown} из ${items.length}`}</span>
            <div>
                {shown < items.length && <button type="button" className="list-more" aria-controls={id} aria-expanded={shown > initial} onClick={() => setExpansion({ limit: shown + step, target, collapsed: false })}>
                    {kk ? `Тағы ${more} көрсету` : `Показать ещё ${more}`}<ChevronDown size={16}/>
                </button>}
                {shown > initial && <button type="button" className="list-less" aria-controls={id} aria-expanded={true} onClick={() => setExpansion({ limit: initial, target, collapsed: true })}>
                    {kk ? 'Жию' : 'Свернуть'}<ChevronUp size={16}/>
                </button>}
            </div>
        </div>}
    </div>;
}
