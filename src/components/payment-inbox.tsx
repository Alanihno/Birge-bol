import { ExpandableList } from './expandable-list';
import { tr } from '../lib/i18n';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/app-context';
import { sortAppointments } from '../domain/appointments';
import type { CareState } from '../domain/care';
import { timeLabel } from './care-ui';

export function PaymentInbox({ state }: { state: CareState }) {
    const { data, setActive } = useApp();
    const payments = sortAppointments(state.appointments.filter(a => ['pending', 'rescheduled'].includes(a.status) && ['awaiting_payment', 'payment_reported'].includes(a.payment_state || '')));
    const paid = sortAppointments(state.appointments.filter(a=>a.status==='confirmed'&&a.payment_state==='confirmed'&&Date.parse(a.ends_at||a.starts_at)>=Date.now()));
    if (!payments.length && !paid.length) return null;
    return <section className="panel payment-inbox" aria-label={tr("Оплата записей")}><h2>{tr("Оплата записей")}</h2><p className="muted">{tr("Все дети · здесь остаются и отправленные на проверку оплаты.")}</p>{tr(payments.map(a => <Link className="document-row" key={a.id} to={`/diary?appointment=${a.id}`} onClick={() => setActive(a.child_id)}><div><strong>{tr(a.payment_state === 'payment_reported' ? 'Чек отправлен · ждём специалиста' : 'Нужно оплатить')}</strong><p>{tr(data.children.find(c => c.id === a.child_id)?.label)} · {tr(timeLabel(a.starts_at))}</p><small>{tr(state.specialists.find(s => s.id === a.specialist_id)?.name)}{tr(a.payment_state === 'awaiting_payment' && a.payment_deadline ? ` · оплатить до ${timeLabel(a.payment_deadline)}` : ' · бронь сохраняется до проверки оплаты')}</small></div><span className="text-link">{tr("К оплате →")}</span></Link>))}{tr(paid.length>0&&<details><summary>{tr('Оплаченные записи')} · {tr(paid.length)}</summary>{tr(<ExpandableList items={paid} renderItem={a=><Link key={a.id} className="document-row" to={`/diary?appointment=${a.id}`} onClick={()=>setActive(a.child_id)}><div><strong>{tr('Оплата подтверждена')}</strong><p>{tr(data.children.find(c=>c.id===a.child_id)?.label)} · {tr(timeLabel(a.starts_at))}</p><small>{tr(state.specialists.find(s=>s.id===a.specialist_id)?.name)}</small></div><span>→</span></Link>} className="stack"/>)}</details>)}</section>;
}
