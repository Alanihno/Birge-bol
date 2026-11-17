import { tr } from '../lib/i18n';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/app-context';
import type { CareState } from '../domain/care';

export function WeeklyReport({ state }: { state: CareState }) {
    const { activeChild, data } = useApp();
    const goals = data.goals.filter(g => g.child_id === activeChild.id);
    const completions = state.completions.filter(c => c.child_id === activeChild.id && Date.parse(c.created_at) >= Date.now() - 7 * 86400000);
    const visits = state.appointments.filter(a => a.child_id === activeChild.id && a.visit_verified && Date.parse(a.visited_at || a.starts_at) >= Date.now() - 7 * 86400000);
    if (!goals.length && !completions.length && !visits.length) return null;
    return <section className="panel stack"><h2>{tr("Отчёт за неделю")}</h2>{tr(state.is_demo && <span className="subtle-badge">{tr("Сводка наблюдений за неделю")}</span>)}<p>{tr("Подтверждённых посещений:")}<strong>{tr(visits.length)}</strong> {tr("· отметок домашних заданий:")}<strong>{tr(completions.length)}</strong></p>{tr(goals.map(g => { const entries = [...g.entries].sort((a,b) => b.created_at.localeCompare(a.created_at)); return <div key={g.id}><h3>{tr(g.title)}</h3><p>{tr("Этап")}{tr(g.stage || 1)} {tr("из 4 ·")}{tr(g.metric)}: {tr(entries[0]?.value ?? 0)} {tr("из")}{tr(g.target)}</p>{tr(entries[0]?.note && <p className="muted">{tr("Последнее наблюдение:")}{tr(entries[0].note)}</p>)}</div>; }))}<p className="tiny muted">{tr("Отчёт собран из посещений, целей и отметок семьи. Регулярность занятий сама по себе не оценивает развитие ребёнка.")}</p><Link className="text-link" to="/child/goals">{tr("Цели и все наблюдения →")}</Link></section>;
}
