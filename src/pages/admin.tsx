import { ModerationQueue } from '../components/moderation-queue';
/* localized-copy */
import { tr, locale, useLocale } from '../lib/i18n';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, ShieldCheck, Search } from 'lucide-react';
import { supabase, mode } from '../lib/backend';
import { useApp } from '../lib/app-context';
import { demoSpecialists, specialties, districts, terms } from '../domain/data';
import type { Specialist, Review, Question } from '../domain/types';
import { money, normalize, safeUrl } from '../domain/logic';
import { Button, Empty, ErrorState, Loading, Modal, Notice, PageHeading } from '../components/ui';
type AdminData = {
    specialists: Specialist[];
    reviews: Review[];
    questions: Question[];
    terms: {
        id: string;
        term: string;
        title: string;
        meaning: string;
        approved: boolean;
    }[];
    rules: {
        id: string;
        title: string;
        version: string;
        enabled: boolean;
        approved: boolean;
    }[];
    audit: {
        id: string;
        entity: string;
        action: string;
        created_at: string;
    }[];
};
export default function Admin() {
    useLocale();
    const { userId, data: personal, refresh, notify } = useApp();
    const qc = useQueryClient();
    const [tab, setTab] = useState('specialists');
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<Specialist | null>(null);
    const [termEdit, setTermEdit] = useState<AdminData['terms'][number] | null>(null);
    const [busy, setBusy] = useState(false);
    const demo = mode === 'demo';
    const { data: role, isPending: roleLoading } = useQuery({ queryKey: ['role', userId], enabled: !demo && !!userId, queryFn: async () => { const r = await supabase!.from('user_roles').select('role').eq('user_id', userId!).maybeSingle(); if (r.error)
            throw r.error; return r.data?.role || 'parent'; } });
    const allowed = demo || role === 'admin' || role === 'moderator';
    const { data, isPending, isError, refetch } = useQuery<AdminData>({ queryKey: ['admin', mode, userId], enabled: allowed, queryFn: async () => { if (demo) {
            let catalog = demoSpecialists;
            try {
                catalog = JSON.parse(localStorage.getItem('bb-demo-catalog') || 'null') || demoSpecialists;
            }
            catch { /* fallback */ }
            return { specialists: catalog, reviews: personal.reviews, questions: personal.questions, terms: terms.map((t, i) => ({ ...t, id: String(i), approved: false })), rules: [{ id: 'demo-rule', title: 'Пример правила для запроса по речи', version: '2026.11.demo.1', enabled: false, approved: false }], audit: [] };
        } const result = await Promise.all(['specialists', 'reviews', 'questions', 'medical_terms', 'recommendation_rules', 'audit_logs'].map(table => supabase!.from(table).select('*').limit(200))); for (const r of result)
            if (r.error)
                throw r.error; return { specialists: result[0].data, reviews: result[1].data, questions: result[2].data, terms: result[3].data, rules: result[4].data, audit: result[5].data } as AdminData; } });
    async function change(table: string, id: string, patch: Record<string, unknown>) { setBusy(true); try {
        if (demo) {
            if (table === 'specialists') {
                const next = data!.specialists.map(s => s.id === id ? { ...s, ...patch } : s);
                localStorage.setItem('bb-demo-catalog', JSON.stringify(next));
            }
            else if (table === 'reviews') {
                const raw = JSON.parse(localStorage.getItem('bb-synthetic-v1') || '{}');
                if (raw.reviews)
                    raw.reviews = raw.reviews.map((r: Review) => r.id === id ? { ...r, ...patch } : r);
                localStorage.setItem('bb-synthetic-v1', JSON.stringify(raw));
            }
            else {
                notify("действие: данные справочника не утверждаются экспертом в локальном режиме.");
                return;
            }
        }
        else {
            const r = await supabase!.from(table).update(patch).eq('id', id);
            if (r.error)
                throw r.error;
        }
        await qc.invalidateQueries();
        await refresh();
        notify('Изменения сохранены');
    }
    catch {
        notify('Изменение отклонено. Проверьте права и поля.');
    }
    finally {
        setBusy(false);
    } }
    async function saveSpecialist(e: React.FormEvent) { e.preventDefault(); if (!editing)
        return; if (editing.contact_url && !safeUrl(editing.contact_url)) {
        notify('Допустимы только безопасные https-ссылки');
        return;
    } setBusy(true); try {
        if (demo) {
            const next = [...data!.specialists.filter(s => s.id !== editing.id), editing];
            localStorage.setItem('bb-demo-catalog', JSON.stringify(next));
        }
        else {
            const r = await supabase!.from('specialists').upsert({ ...editing, contact_consent: !!editing.contact_url });
            if (r.error)
                throw r.error;
        }
        setEditing(null);
        await qc.invalidateQueries();
        notify('Профиль сохранён');
    }
    catch {
        notify('Не удалось сохранить профиль');
    }
    finally {
        setBusy(false);
    } }
    if (!demo && !userId)
        return <Empty title={tr("Вход для модератора")} description={tr("Роль назначается доверенным администратором в базе, а не в браузере.")} to="/auth?next=/admin" label={tr("Войти")}/>;
    if (!demo && roleLoading)
        return <Loading />;
    if (!allowed)
        return <Empty title={tr("Доступ ограничен")} description={tr("Аккаунту не назначена роль модератора. Запросы к БД также защищены RLS.")} to="/find"/>;
    if (isPending)
        return <Loading />;
    if (isError || !data)
        return <ErrorState retry={() => void refetch()}/>;
    const filtered = data.specialists.filter(s => normalize(s.name + ' ' + s.specialty).includes(normalize(search)));
    return <><ModerationQueue/><PageHeading eyebrow={tr("BIRGE BOL \u00B7 РАБОЧЕЕ ПРОСТРАНСТВО")} title={tr("Модерация")} description={tr("Проверка публичных материалов. Доступ к приватным детям здесь не предоставляется.")}/>{tr(demo && <Notice tone="peach">{tr("админка на локальных данных. Она не назначает роли и не подтверждает реальные посещения.")}</Notice>)}<div className="filter-chips">{tr([['specialists', 'Специалисты'], ['reviews', 'Отзывы'], ['questions', 'Вопросы'], ['terms', 'Словарь'], ['rules', 'Правила'], ['audit', 'Журнал']].map(([key, label]) => <button className={`chip ${tab === key ? 'selected' : ''}`} key={key} onClick={() => setTab(key)}>{tr(label)}</button>))}</div>{tr(tab === 'specialists' && <><div className="search-row"><div className="search-input"><Search size={18}/><input aria-label={tr("Поиск в админке")} value={search} onChange={e => setSearch(e.target.value)} placeholder={tr("Имя или специализация")}/></div><Button onClick={() => setEditing({ ...demoSpecialists[0], id: crypto.randomUUID(), name: "Новый профиль", published: false })}><Plus size={17}/>{tr("Добавить")}</Button></div><div className="admin-list">{tr(filtered.map(s => <div className="panel admin-row" key={s.id}><div><strong>{tr(s.name)}</strong><p>{tr(s.specialty)} · {tr(s.district)} · {tr(money(s.price))} · {tr(s.published ? 'Опубликован' : 'Скрыт')}</p></div><Button variant="ghost" onClick={() => setEditing(s)}><Pencil size={16}/>{tr("Изменить")}</Button><Button variant="secondary" disabled={busy} onClick={() => void change('specialists', s.id, { published: !s.published })}>{tr(s.published ? 'Скрыть' : 'Опубликовать')}</Button></div>))}</div></>)}{tr(tab === 'reviews' && (data.reviews.length ? data.reviews.map(r => <div className="panel" key={r.id}><span className="subtle-badge">{tr(r.status)}</span><p>{tr(r.body)}</p><Notice>{tr("Для статуса \u00ABподтверждён\u00BB требуется реальное доказательство посещения; синтетический отзыв не может его получить.")}</Notice><div className="form-actions"><Button variant="secondary" disabled={busy} onClick={() => void change('reviews', r.id, { status: 'rejected' })}>{tr("Отклонить")}</Button><Button variant="ghost" disabled={busy} onClick={() => void change('reviews', r.id, { status: 'pending' })}>{tr("Вернуть на проверку")}</Button></div></div>) : <Empty title={tr("Нет отзывов для проверки")} description={tr("Новые отзывы появятся после сохранения чек-листа с согласием на передачу текста.")}/>))}{tr(tab === 'questions' && (data.questions.length ? data.questions.map(q => <div className="panel" key={q.id}><span className="subtle-badge">{tr(q.status)}</span><h3>{tr(q.title)}</h3><p>{tr(q.body)}</p><div className="form-actions"><Button disabled={busy} onClick={() => void change('questions', q.id, { status: 'open' })}>{tr("Опубликовать обезличенный вопрос")}</Button><Button variant="secondary" disabled={busy} onClick={() => void change('questions', q.id, { status: 'closed' })}>{tr("Скрыть")}</Button></div></div>) : <Empty title={tr("Очередь вопросов пуста")} description={tr("В подключённом режиме вопросы сначала поступают на модерацию.")}/>))}{tr(tab === 'terms' && data.terms.map(t => <div className="panel admin-row" key={t.id}><div><strong>{tr(t.term)} — {tr(t.title)}</strong><p>{tr(t.meaning)}</p><span className="tiny muted">{tr(t.approved ? 'Утверждён экспертом' : 'Требует проверки')}</span></div><Button variant="ghost" onClick={() => setTermEdit(t)}><Pencil size={16}/>{tr("Редактировать")}</Button></div>))}{tr(tab === 'rules' && <><Notice>{tr("Рабочие рекомендации сейчас выполняются типизированным модулем с тестами. Изменения таблицы правил не меняют алгоритм автоматически и требуют выпуска новой версии приложения.")}</Notice>{tr(data.rules.length ? data.rules.map(r => <div key={r.id} className="panel admin-row"><div><strong>{tr(r.title)}</strong><p>{tr(r.version)} · {tr(r.enabled ? 'Включено в реестре' : 'Отключено')}</p></div><Button variant="secondary" disabled={busy || !r.approved} onClick={() => void change('recommendation_rules', r.id, { enabled: !r.enabled })}>{tr(r.enabled ? 'Отключить' : 'Включить')}</Button></div>) : <p>{tr("Реестр пуст. Исходный модуль: src/domain/logic.ts, версия 2026.11.demo.1.")}</p>)}</>)}{tr(tab === 'audit' && (data.audit.length ? data.audit.map(a => <div className="panel admin-row" key={a.id}><ShieldCheck size={19}/><strong>{tr(a.entity)} · {tr(a.action)}</strong><span>{tr(new Date(a.created_at).toLocaleString(locale()))}</span></div>) : <Empty title={tr("Записей в журнале пока нет")} description={tr("В Supabase критические изменения специалистов, отзывов и словаря записываются триггерами без приватных текстов.")}/>))}<Modal open={!!editing} onOpenChange={b => { if (!b)
        setEditing(null); }} title={tr("Профиль специалиста")}>{tr(editing && <form className="stack" onSubmit={e => void saveSpecialist(e)}><label>{tr("Имя")}<input required minLength={2} maxLength={100} value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}/></label><div className="form-grid"><label>{tr("Специализация")}<select value={editing.specialty} onChange={e => setEditing({ ...editing, specialty: e.target.value })}>{tr(specialties.map(s => <option key={s} value={s}>{tr(s)}</option>))}</select></label><label>{tr("Район")}<select value={editing.district} onChange={e => setEditing({ ...editing, district: e.target.value })}>{tr(districts.map(d => <option key={d} value={d}>{tr(d)}</option>))}</select></label><label>{tr("Цена, \u20B8")}<input required min={0} max={1000000} type="number" value={editing.price} onChange={e => setEditing({ ...editing, price: Number(e.target.value) })}/></label><label>{tr("Стаж")}<input required min={0} max={70} type="number" value={editing.experience} onChange={e => setEditing({ ...editing, experience: Number(e.target.value) })}/></label></div><label>{tr("Описание")}<textarea required maxLength={3000} value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })}/></label><label>{tr("Ссылка на запись, только с согласием специалиста")}<input type="url" value={editing.contact_url || ''} onChange={e => setEditing({ ...editing, contact_url: e.target.value || null })}/></label><label className="checkbox"><input type="checkbox" checked={editing.online} onChange={e => setEditing({ ...editing, online: e.target.checked })}/>{tr("Работает онлайн")}</label><Notice>{tr("статус сохраняется. Не вводите настоящие контакты без согласованной процедуры.")}</Notice><Button disabled={busy}>{tr("Сохранить профиль")}</Button></form>)}</Modal><Modal open={!!termEdit} onOpenChange={b => { if (!b)
        setTermEdit(null); }} title={tr("Редактирование термина")}>{tr(termEdit && <form className="stack" onSubmit={e => { e.preventDefault(); void change('medical_terms', termEdit.id, { meaning: termEdit.meaning, approved: false }).then(() => setTermEdit(null)); }}><h3>{tr(termEdit.term)}</h3><label>{tr("Объяснение")}<textarea rows={7} maxLength={3000} required value={termEdit.meaning} onChange={e => setTermEdit({ ...termEdit, meaning: e.target.value })}/></label><p className="muted tiny">{tr("Изменённый текст снова требует экспертного утверждения. Локальный словарь обновляется отдельным выпуском.")}</p><Button disabled={busy}>{tr("Сохранить черновик")}</Button></form>)}</Modal></>;
}
