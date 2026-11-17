import { saveConsent } from '../lib/consents';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useApp } from '../lib/app-context';
import { repository } from '../lib/repository';
import { districts } from '../domain/data';
import { tr, useLocale } from '../lib/i18n';
import { Button, Modal, Notice } from './ui';

export function AddChildren() {
    useLocale();
    const app = useApp();
    const row = () => ({ id: crypto.randomUUID(), label: '', age: '2–3' });
    const [open, setOpen] = useState(false), [rows, setRows] = useState(() => [row()]);
    const [district, setDistrict] = useState(app.activeChild.district);
    const [saved, setSaved] = useState<string[]>([]), [busy, setBusy] = useState(false), [consent, setConsent] = useState(false), [error, setError] = useState('');
    async function save() {
        if (!app.userId || !consent || rows.some(child => !child.label.trim())) return;
        setBusy(true); setError('');
        const completed = [...saved];
        try {
            await saveConsent(app.userId,'child_authority');
            for (const child of rows) {
                if (completed.includes(child.id)) continue;
                await repository.saveChild(app.userId, { ...app.activeChild, ...child, case_group:'unknown', label: child.label.trim() + (child.label.toLowerCase().includes("") ? '' : ""), city: 'Алматы', district, concerns: [...app.activeChild.concerns] });
                completed.push(child.id); setSaved([...completed]);
            }
            await app.refresh(); app.setActive(rows[0].id); app.notify('Профили детей добавлены'); setOpen(false);
        } catch { setError(`Сохранено ${completed.length} из ${rows.length}. Проверьте соединение и повторите: сохранённые профили не будут добавлены повторно.`); await app.refresh(); }
        finally { setBusy(false); }
    }
    return <><Button variant="secondary" onClick={() => { setRows([row()]); setSaved([]); setConsent(false); setError(''); setOpen(true); }}><Plus size={17}/>{tr('Добавить детей')}</Button>
        <Modal open={open} onOpenChange={value => { if (!busy) setOpen(value); }} title={tr('Добавить детей')}>
            <form className="stack" onSubmit={event => { event.preventDefault(); void save(); }}>
                <Notice>{tr("Можно добавить несколько детей сразу. Для общего тестового аккаунта используйте имена.")}</Notice>
                {tr(rows.map((child, index) => <fieldset key={child.id} disabled={busy || saved.includes(child.id)} className="children-batch-row"><legend>{tr('Ребёнок')} {tr(index + 1)}{tr(saved.includes(child.id) ? ' ✓' : '')}</legend>
                    <label>{tr('Имя или псевдоним')}<input required maxLength={70} value={child.label} onChange={event => setRows(rows.map(item => item.id === child.id ? { ...item, label: event.target.value } : item))}/></label>
                    <label>{tr('Возраст')}<select value={child.age} onChange={event => setRows(rows.map(item => item.id === child.id ? { ...item, age: event.target.value } : item))}>{tr(['2–3', '4–5', '6–8', '9–12'].map(age => <option key={age} value={age}>{tr(age)}</option>))}</select></label>
                    {tr(rows.length > 1 && <Button type="button" variant="ghost" aria-label={tr('Убрать ребёнка') + ' ' + (index + 1)} onClick={() => setRows(rows.filter(item => item.id !== child.id))}><Trash2 size={16}/></Button>)}
                </fieldset>))}
                <Button type="button" variant="ghost" disabled={busy || rows.length >= 10 || saved.length > 0} onClick={() => setRows([...rows, row()])}><Plus size={16}/>{tr('Ещё ребёнок')}</Button>
                <label>{tr('Район семьи')}<select value={district} disabled={busy || saved.length > 0} onChange={event => setDistrict(event.target.value)}>{tr(districts.map(item => <option key={item} value={item}>{tr(item)}</option>))}</select></label>
                <label className="checkbox"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} required/>{tr("Согласен сохранить профили детей в аккаунте и подтверждаю полномочия законного представителя")}</label>
                {tr(error && <p role="alert" className="error">{tr(error)}</p>)}
                <Button busy={busy} disabled={!consent || rows.some(child => !child.label.trim())} type="submit">{tr('Сохранить детей')} · {tr(rows.length)}</Button>
            </form>
        </Modal>
    </>;
}
