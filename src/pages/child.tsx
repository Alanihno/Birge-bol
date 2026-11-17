import { AddChildren } from '../components/add-children';
import { useCare } from '../lib/care-api';
import { HomeworkEvents } from './diary';
/* localized-copy */
import { tr, locale, useLocale } from '../lib/i18n';
import { useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, AudioLines, BookOpen, CalendarDays, Check, Plus, Sprout, Target } from 'lucide-react';
import { useApp } from '../lib/app-context';
import { repository } from '../lib/repository';
import { Button, Empty, Modal, Notice, PageHeading, Loading, ErrorState } from '../components/ui';
import { SpecialistCard } from '../components/specialist-card';
export default function ChildPage() {
    useLocale();
    const care=useCare();
    const { userId, data, activeChild, setActive, refresh, notify, personal } = useApp();
    const { pathname } = useLocation();
    const [goalOpen, setGoalOpen] = useState(false);
    const [goalTitle, setGoalTitle] = useState('');
    const [metric, setMetric] = useState('Наблюдаемые попытки за день');
    const [target, setTarget] = useState(5);
    const [due, setDue] = useState('');
    const [entryGoal, setEntryGoal] = useState('');
    const [value, setValue] = useState(0);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const { data: catalog = [] } = useQuery({ queryKey: ['catalog'], queryFn: () => repository.catalog(), staleTime: 60000 });
    const goals = data.goals.filter(g => g.child_id === activeChild.id);
    const favorites = catalog.filter(s => data.favorites.includes(s.id));
    const engaged = !!favorites.length || !!data.appointments.length || !!care.data?.appointments.some(a=>a.child_id===activeChild.id);
    const goalsOnly = pathname === '/child/goals';
    const recordingsOnly = pathname === '/child/recordings';
    async function addGoal(e: React.FormEvent) { e.preventDefault(); if (!userId)
        return; setBusy(true); try {
        await repository.saveGoal(userId, { id: crypto.randomUUID(), child_id: activeChild.id, title: goalTitle.trim(), metric, target, status: 'active', due_at: due, entries: [] });
        await refresh();
        setGoalOpen(false);
        setGoalTitle('');
        notify("цель добавлена");
    }
    catch {
        notify('Не удалось сохранить цель');
    }
    finally {
        setBusy(false);
    } }
    async function addEntry(e: React.FormEvent) { e.preventDefault(); if (!userId)
        return; setBusy(true); try {
        await repository.addEntry(userId, entryGoal, { id: crypto.randomUUID(), value, note: note.trim(), created_at: new Date().toISOString() });
        await refresh();
        setEntryGoal('');
        setNote('');
        notify('Наблюдение добавлено');
    }
    catch {
        notify('Не удалось сохранить наблюдение');
    }
    finally {
        setBusy(false);
    } }
    if (userId && personal.isPending)
        return <Loading />;
    if (personal.isError)
        return <ErrorState retry={() => void personal.refetch()}/>;
    return <><Link className="btn secondary spaced" to="/child/team">{tr("Команда ребёнка · общий план →")}</Link><PageHeading eyebrow={tr("МАЛЕНЬКИЕ ШАГИ ИМЕЮТ ЗНАЧЕНИЕ")} title={tr(goalsOnly ? 'Цели и наблюдения' : recordingsOnly ? 'Было — стало' : 'Мой ребёнок')} description={tr("Замечайте изменения в своём темпе. Без сравнений с другими детьми.")} action={userId ? <AddChildren/> : <Link className="btn primary" to="/auth">{tr("Войти в личное пространство")}</Link>}/>{tr(!userId ? <><Notice>{tr("Профиль можно посмотреть без входа. Для сохранения данных войдите в аккаунт.")}</Notice><Empty title={tr("Место для вашего пути")} description={tr("Цели, наблюдения и ваши специалисты будут собраны здесь.")} to="/auth" label={tr("Открыть дневник")}/></> : !data.children.length ? <Empty title={tr("Начнём со знакомства")} description={tr("Добавьте профиль через короткую анкету.")} to="/onboarding" label={tr("Заполнить анкету")}/> : <><div className="child-profile panel"><div className="child-avatar"><Sprout size={36}/></div><div><h2>{tr(activeChild.label)}</h2><p>{tr(activeChild.age)}{tr("года \u00B7 ")}{tr(activeChild.city)}, {tr(activeChild.district)}</p></div><label className="profile-switch"><span className="sr-only">{tr("Активный профиль")}</span><select value={activeChild.id} onChange={e => setActive(e.target.value)}>{tr(data.children.map(c => <option key={c.id} value={c.id}>{tr(c.label)}</option>))}</select></label></div><div className="child-tabs"><Link to="/diary">{tr("Приёмы")}</Link><Link to="/diary?tab=home">{tr("Дома")}</Link><Link className={pathname === '/child' ? 'active' : ''} to="/child">{tr("Обзор")}</Link><Link className={goalsOnly ? 'active' : ''} to="/child/goals">{tr("Цели и наблюдения")}</Link><Link className={recordingsOnly ? 'active' : ''} to="/child/recordings">{tr("Аудиопримеры")}</Link></div>{tr(!engaged && <Notice>{tr("Сначала можно сохранить специалиста или добавить занятие в его карточке. После этого начните собственные наблюдения. Готовая цель ниже — помеченный пример.")}</Notice>)}{tr(!recordingsOnly && <><div className="section-title"><h2><Target size={20}/>{tr("Цель на месяц")}</h2><Button variant="ghost" onClick={() => setGoalOpen(true)} disabled={!engaged}><Plus size={16}/>{tr("Добавить цель")}</Button></div>{tr(goals.length ? goals.map(g => { const entries = [...g.entries].sort((a, b) => a.created_at.localeCompare(b.created_at)); return <div className="panel goal-card" key={g.id}><div className="goal-heading"><span className="subtle-badge">{tr(g.id === 'goal-demo' ? "Готовый пример" : 'Добавлено родителем')}</span><span className="tiny muted">{tr("Ориентир до ")}{tr(new Date(g.due_at).toLocaleDateString(locale()))}</span></div><h3>{tr(g.title)}</h3>{tr(g.specialist_id&&<><span className="subtle-badge">{tr("Цель специалиста · этап")}{tr(g.stage||1)} {tr("из 4")}</span><div className="goal-segments">{tr([1,2,3,4].map(i=><i key={i} className={i<=(g.stage||1)?'filled':''}/>))}</div></>)}<p>{tr(g.metric)}{tr("\u00B7 ориентир: ")}{tr(g.target)}</p>{tr(entries.length > 0 ? <div className="observation-summary"><div><small>{tr("Первое наблюдение")}</small><strong>{tr(entries[0].value)}</strong></div><span>→</span><div><small>{tr("Последнее наблюдение")}</small><strong>{tr(entries[entries.length - 1].value)}</strong></div><p>{tr("По вашим записям.")}<br />{tr("Без оценки медицинского результата.")}</p></div> : <p className="muted">{tr("Наблюдений пока нет. Процент достижения не рассчитывается.")}</p>)}<div className="timeline">{tr(entries.map(e => <div key={e.id}><span /><div><small>{tr(new Date(e.created_at).toLocaleDateString(locale()))}</small><p>{tr(e.note || 'Наблюдение без комментария')} <strong>· {tr(e.value)}</strong></p></div></div>))}</div><Button variant="secondary" disabled={!engaged} onClick={() => { setEntryGoal(g.id); setValue(0); }}>{tr("Добавить наблюдение ")}<Plus size={15}/></Button></div>; }) : <Empty title={tr("Одна понятная цель \u2014 хорошее начало")} description={tr("Согласуйте её со специалистом и запишите, что можно наблюдать дома.")}/>)}</>)}{tr(!goalsOnly && <><div className="section-title"><h2><AudioLines size={20}/>{tr("Было \u2014 стало")}</h2><span className="subtle-badge">{tr("Нейтральные синтетические звуки")}</span></div><AudioComparison /></>)}{tr(!goalsOnly && !recordingsOnly && <><div className="section-title"><h2>{tr("Мои специалисты")}</h2><Link className="text-link" to="/favorites">{tr("Все сохранённые ")}<ArrowRight size={15}/></Link></div>{tr(favorites.length ? <div className="specialist-grid">{tr(favorites.slice(0, 3).map(s => <SpecialistCard key={s.id} specialist={s}/>))}</div> : <Empty title={tr("Найдите того, с кем спокойно")} description={tr("Сохраните специалиста из каталога, чтобы вернуться к нему позже.")} to="/find"/>)}{tr(data.appointments.filter(a => a.child_id === activeChild.id).map(a => <div className="panel inline-link" key={a.id}><CalendarDays /><div><strong>{tr(new Date(a.starts_at).toLocaleString(locale()))}</strong><p>{tr(catalog.find(s => s.id === a.specialist_id)?.name)}{tr("\u00B7 Ваша отметка, запись не подтверждена")}</p></div><Link className="text-link" to={`/feedback/new?specialist=${a.specialist_id}`}>{tr("Чек-лист \u2192")}</Link></div>))}<Link className="panel inline-link" to="/explain"><BookOpen size={26}/><div><h3>{tr("Объяснить сложный термин")}</h3><p>{tr("Словарь, который помогает подготовиться к разговору.")}</p></div><ArrowRight size={19}/></Link><Link className="btn secondary" to="/feedback/new">{tr("Заполнить чек-лист после занятия")}</Link></>)}</>)}{tr(care.data&&!recordingsOnly&&<HomeworkEvents state={care.data}/>)}<Modal open={goalOpen} onOpenChange={setGoalOpen} title={tr("Новая цель")}><form className="stack" onSubmit={e => void addGoal(e)}><label>{tr("Что хочется замечать")}<input required minLength={5} maxLength={180} value={goalTitle} onChange={e => setGoalTitle(e.target.value)} placeholder={tr("Просить о помощи удобным способом")}/></label><label>{tr("Что измеряем")}<input required maxLength={100} value={metric} onChange={e => setMetric(e.target.value)}/></label><label>{tr("Ориентир")}<input type="number" required min={1} max={1000} value={target} onChange={e => setTarget(Number(e.target.value))}/></label><label>{tr("Когда обсудить снова")}<input type="date" required value={due} onChange={e => setDue(e.target.value)}/></label><Button disabled={busy}>{tr("Сохранить цель")}</Button></form></Modal><Modal open={!!entryGoal} onOpenChange={b => { if (!b)
        setEntryGoal(''); }} title={tr("наблюдение")}><form className="stack" onSubmit={e => void addEntry(e)}><label>{tr("Количество попыток")}<input required type="number" min={0} max={1000} value={value} onChange={e => setValue(Number(e.target.value))}/></label><label>{tr("Что заметили")}<textarea maxLength={500} value={note} onChange={e => setNote(e.target.value)} placeholder={tr("Только сведения")}/></label><Button disabled={busy}>{tr("Сохранить наблюдение")}</Button></form></Modal></>;
}
function AudioComparison() { useLocale(); const first = useRef<HTMLAudioElement>(null); const second = useRef<HTMLAudioElement>(null); const [compare, setCompare] = useState(false); return <div className="panel"><Notice>{tr("Сгенерированные нейтральные тоны, без голоса ребёнка. Пример плеера, а не доказательство прогресса. Запись и загрузка реального аудио отключены.")}</Notice><div className="audio-grid"><div><span>{tr("01 · пример А")}</span><h3>{tr("Первое наблюдение")}</h3><audio ref={first} src="/audio/example-a.wav" controls preload="metadata" aria-label={tr("Синтетический аудиопример А")} onPlay={() => second.current?.pause()} onEnded={() => { if (compare)
    void second.current?.play().catch(() => setCompare(false)); }}/></div><div><span>{tr("02 · пример Б")}</span><h3>{tr("Второе наблюдение")}</h3><audio ref={second} src="/audio/example-b.wav" controls preload="metadata" aria-label={tr("Синтетический аудиопример Б")} onPlay={() => first.current?.pause()} onEnded={() => setCompare(false)}/></div></div><Button variant="secondary" onClick={() => { setCompare(true); if (first.current) {
    first.current.currentTime = 0;
    void first.current.play().catch(() => setCompare(false));
} }}><AudioLines size={17}/>{tr("Послушать последовательно")}</Button>{tr(compare && <span className="tiny muted"> <Check size={12}/>{tr("Сравнение примеров")}</span>)}</div>; }
