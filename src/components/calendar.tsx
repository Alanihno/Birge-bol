import { tr, locale, useLocale } from '../lib/i18n';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../lib/app-context';
import { useCare } from '../lib/care-api';
import { dateKey } from '../lib/journey';
import { isUpcomingAppointment } from '../domain/appointments';
import { statusLabels } from '../domain/care';
import { paymentLabels } from './payment-actions';
import { ExpandableList } from './expandable-list';
import { Loading, ErrorState } from './ui';

export function AppointmentCalendar() {
    useLocale();
    const { activeChild } = useApp(), care = useCare();
    const [month, setMonth] = useState(() => dateKey().slice(0, 7)), [selected, setSelected] = useState(''), [view, setView] = useState('month');
    if (care.isPending) return <Loading/>;
    if (care.isError || !care.data) return <ErrorState retry={() => void care.refetch()}/>;
    const state = care.data, bookings = state.appointments.filter(a => a.child_id === activeChild.id);
    const [y, m] = month.split('-').map(Number), days = new Date(y, m, 0).getDate(), offset = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    const upcoming = bookings.filter(a => isUpcomingAppointment(a));
    const dayKey = (value: string) => new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Almaty' });
    // The default preview includes the nearest appointments even across a month boundary.
    const shown = (view === 'upcoming' || !selected && month === dateKey().slice(0, 7) ? upcoming : bookings.filter(a => dayKey(a.starts_at).startsWith(selected || month)))
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    function move(delta: number) { setMonth(dateKey(new Date(y, m - 1 + delta, 1)).slice(0, 7)); setSelected(''); }
    return <section className="panel calendar-panel">
        <div className="section-title"><h2><CalendarDays size={21}/>{tr('Календарь приёмов')}</h2><span className="subtle-badge">{tr('Ближайших: ')}{upcoming.length}</span></div>
        <div className="calendar-view-tabs"><button className={view === 'month' ? 'active' : ''} onClick={() => setView('month')}>{tr('Месяц')}</button><button className={view === 'upcoming' ? 'active' : ''} onClick={() => setView('upcoming')}>{tr('Ближайшие')}</button></div>
        {view === 'month' && <>
            <div className="calendar-toolbar"><button className="icon-btn" aria-label={tr('Предыдущий месяц')} onClick={() => move(-1)}><ChevronLeft size={18}/></button><strong>{tr(new Date(y, m - 1, 1).toLocaleDateString(locale(), { month: 'long', year: 'numeric' }))}</strong><button className="icon-btn" aria-label={tr('Следующий месяц')} onClick={() => move(1)}><ChevronRight size={18}/></button><button className="calendar-today" onClick={() => { setMonth(dateKey().slice(0, 7)); setSelected(''); }}>{tr('Сегодня')}</button></div>
            <div className="calendar-grid">{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => <small key={day}>{tr(day)}</small>)}
                {Array.from({ length: offset }, (_, i) => <span key={'blank' + i}/>)}
                {Array.from({ length: days }, (_, i) => {
                    const day = month + '-' + String(i + 1).padStart(2, '0'), count = bookings.filter(b => dayKey(b.starts_at) === day && !['cancelled', 'expired'].includes(b.status)).length;
                    return <button className={`calendar-day ${day === dateKey() ? 'today' : ''} ${selected === day ? 'selected' : ''}`} key={day} aria-pressed={selected === day} aria-label={tr(`${day}${count ? ', приёмов: ' + count : ''}`)} onClick={() => setSelected(selected === day ? '' : day)}>{i + 1}{count > 0 && <span className="appointment-dot"/>}</button>;
                })}
            </div>
        </>}
        <ExpandableList key={`${activeChild.id}:${view}:${month}:${selected}`} items={shown} className="calendar-previews" label={tr('Приёмы')} renderItem={a => {
            const date = new Date(a.starts_at), specialist = state.specialists.find(s => s.id === a.specialist_id);
            return <Link className="appointment-preview" to={`/diary?appointment=${a.id}`}>
                <div className="preview-date"><strong>{date.toLocaleDateString(locale(), { timeZone: 'Asia/Almaty', day: 'numeric' })}</strong><small>{tr(date.toLocaleDateString(locale(), { timeZone: 'Asia/Almaty', month: 'short' }))}</small></div>
                <div className="preview-description"><strong>{date.toLocaleTimeString(locale(), { timeZone: 'Asia/Almaty', hour: '2-digit', minute: '2-digit' })} · {tr(specialist?.name || 'Специалист')}</strong><small>{tr(a.service)}</small><span className={`preview-status ${a.payment_state === 'awaiting_payment' ? 'payment-due' : ''}`}>{tr(paymentLabels[a.payment_state || ''] || statusLabels[a.status] || a.status)}</span></div>
                <ChevronRight size={18}/>
            </Link>;
        }}/>
        {!shown.length && <div className="calendar-empty"><CalendarDays/><div><strong>{tr(selected ? 'На выбранные даты приёмов нет' : 'Здесь появятся ваши встречи')}</strong><p>{tr('Выберите специалиста и отправьте заявку.')}</p><Link className="text-link" to="/find">{tr('Найти специалиста →')}</Link></div></div>}
        <Link className="text-link" to="/diary">{tr('Все приёмы и задания →')}</Link>
    </section>;
}
