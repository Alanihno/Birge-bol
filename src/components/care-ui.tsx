import { safeError } from '../lib/safe-error';
import { SafeVideo } from './safe-video';
import { youtubeId } from '../lib/youtube';
import { MessageTranslation } from './message-translation';
import { PaymentActions } from './payment-actions';
/* localized-copy */
import { locale, tr, useLocale } from '../lib/i18n';
import { resolveMaterialMedia } from '../lib/material-media';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../lib/app-context';
import { useCare } from '../lib/care-api';
import type { CareAppointment, CareState, Material } from '../domain/care';
import { statusLabels } from '../domain/care';
import { Button, Modal, Notice } from './ui';
export const timeLabel = (value: string) => new Date(value).toLocaleString(locale(), { timeZone: 'Asia/Almaty', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
export function useCareActions() { const care = useCare(), { notify } = useApp(); const [busy, setBusy] = useState(false), [error, setError] = useState(''); async function run(action: string, p: Record<string, unknown> = {}, message = 'Сохранено') { setBusy(true); setError(''); try {
    const result = await care.act(action, p);
    if (message)
        notify(message);
    return result;
}
catch (e) {
    setError(safeError(e));
    return null;
}
finally {
    setBusy(false);
} } return { ...care, run, busy, error }; }
export function CareError({ error }: {
    error: string;
}) { useLocale(); return error ? <p className="error" role="alert">{tr(error)}</p> : null; }
export function AppointmentCard({ a, state, provider = false, clinic = false, homeworkRequest = false }: {
    a: CareAppointment;
    state: CareState;
    provider?: boolean;
    clinic?: boolean;
    homeworkRequest?: boolean;
}) {
    useLocale();
    const { userId, setVisitCode } = useApp(), { run, busy, error } = useCareActions(),navigate=useNavigate();
    const [code, setCode] = useState(new URLSearchParams(location.search).get('appointment') === a.id ? new URLSearchParams(location.search).get('code') || '' : ''), [modal, setModal] = useState<'time' | 'message' | ''>(''), [slot, setSlot] = useState(''), [body, setBody] = useState(homeworkRequest?'Здравствуйте! Подскажите, пожалуйста, нужны ли домашние задания для нашего индивидуального плана? Если да, назначьте их через Birge Bol.':'');
    const s = state.specialists.find(s => s.id === a.specialist_id), child = state.patients.find(c => c.id === a.child_id);
    const canChange = ['pending', 'confirmed', 'rescheduled'].includes(a.status), messages = state.messages.filter(m => m.appointment_id === a.id);
    return <article id={`appointment-${a.id}`} tabIndex={-1} className="card care-appointment"><div className="hd"><h2>{tr(timeLabel(a.starts_at))}</h2><span className={`bd ${['confirmed', 'completed'].includes(a.status) ? 'g' : a.status === 'cancelled' ? 'r' : ''}`}>{tr(statusLabels[a.status]||a.status)}</span></div><p><strong>{tr(provider ? child?.label || 'Профиль скрыт до подтверждения и согласия' : s?.name || 'Специалист')}</strong>{tr(child && ` · ${child.age} года`)}</p><p className="m">{tr(a.service)}{tr(a.visited_at&&<span> {tr("· Посещено")}{tr(timeLabel(a.visited_at))}</span>)}{tr(a.is_demo ? ' · тестовая запись' : '')}</p>{tr(provider && <p className="m">{tr(a.child_age ? `${a.child_age} года` : '')}{tr(a.child_district ? ` · ${a.child_district}` : '')}</p>)}{tr(!clinic && <><p>{tr(a.reason)}</p>{tr(a.diagnosis && <Notice>{tr("С согласия родителя: ")}{tr(a.diagnosis)}</Notice>)}</>)}<PaymentActions appointment={a} provider={provider} clinic={clinic}/><div className="row">
 {tr((provider || clinic) && a.status === 'pending' && !a.payment_state && <Button busy={busy} onClick={() => void run('confirm', { appointment_id: a.id }, 'Запись подтверждена')}>{tr("✓ Принять заявку")}</Button>)}
 {tr(provider && child && <Link className="ln" to={'/pro/kids/' + child.id}>{tr("Карточка ребёнка →")}</Link>)}
 {tr((provider || clinic) && canChange && (!a.payment_state||a.payment_state==='confirmed') && <Button variant="secondary" onClick={() => setModal('time')}>{tr("Предложить время")}</Button>)}
 {tr(canChange && <Button variant="ghost" busy={busy} onClick={() => void run('cancel', { appointment_id: a.id }, 'Запись отменена')}>{tr(a.status === 'pending' && (provider || clinic) ? 'Отклонить' : 'Отменить запись')}</Button>)}
 {tr(!provider && !clinic && a.status === 'rescheduled' && <><p>{tr("Предложено: ")}{tr(state.slots.find(s => s.id === a.proposed_slot_id) && timeLabel(state.slots.find(s => s.id === a.proposed_slot_id)!.starts_at))}</p><Button onClick={() => void run('accept_time', { appointment_id: a.id }, 'Перенос подтверждён')}>{tr("Принять новое время")}</Button></>)}
 {tr(provider && a.status === 'confirmed' && <Button busy={busy} onClick={() => void run('issue_code', { appointment_id: a.id }, 'Код действует 30 минут').then(r => { if (r)
        setVisitCode({id:a.id,code:String(r.code)}); })}>{tr("Приём состоялся")}</Button>)}
 {tr(!provider && !clinic && a.status === 'attended' && <div className="code-entry"><label>{tr("Код посещения")}<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value)}/></label><Button busy={busy} disabled={code.length !== 6} onClick={() => void run('redeem_code', { appointment_id: a.id, code }, 'Посещение подтверждено').then(result=>{if(result)navigate('/diary?appointment='+a.id);})}>{tr("Подтвердить посещение")}</Button></div>)}
 {tr(!provider && !clinic && a.visit_verified && !state.reviews.some(r => r.appointment_id === a.id) && <Link className="btn primary" to={'/feedback/' + a.id}>{tr("Оставить отзыв")}</Link>)}
 {tr(!clinic && <Button variant="secondary" onClick={() => setModal('message')}>{tr(provider ? 'Написать маме' : homeworkRequest?'Попросить у специалиста':'Связаться со специалистом')}{tr(messages.length ? ` · ${messages.length}` : '')}</Button>)}
 {tr(!provider && !clinic && <label className="checkbox"><input type="checkbox" checked={!!a.share_diary} onChange={e => void run('consent', { appointment_id: a.id, enabled: e.target.checked }, 'Доступ обновлён')}/>{tr("Разрешаю этому специалисту видеть цели и общую часть дневника. Аудиозаписи приватны.")}</label>)}
 </div>{tr(!provider && !clinic && a.status === 'confirmed' && <details><summary>{tr("Что взять на первый приём")}</summary><p>{tr("Вопросы и наблюдения, вода, привычная игрушка. Необходимость документов и направлений уточните у специалиста.")}</p></details>)}<CareError error={error}/>
 <Modal open={modal === 'time'} onOpenChange={b => { if (!b)
        setModal(''); }} title={tr("Предложить другое время")}><div className="stack"><label>{tr("Свободное окно")}<select value={slot} onChange={e => setSlot(e.target.value)}><option value="">{tr("Выберите время")}</option>{tr(state.slots.filter(s => s.specialist_id === a.specialist_id && s.available && Date.parse(s.starts_at) > Date.now()).map(s => <option key={s.id} value={s.id}>{tr(timeLabel(s.starts_at))}</option>))}</select></label><Button busy={busy} disabled={!slot} onClick={() => void run('propose', { appointment_id: a.id, slot_id: slot }, 'Предложение отправлено').then(r => { if (r)
        setModal(''); })}>{tr("Предложить")}</Button><CareError error={error}/></div></Modal>
 <Modal open={modal === 'message'} onOpenChange={b => { if (!b)
        setModal(''); }} title={tr("Переписка по приёму")}><div className="stack">{tr(messages.map(m => <div className="notice lilac" key={m.id}><div><small>{tr(m.sender_id === userId ? 'Вы' : 'Собеседник')} · {tr(timeLabel(m.created_at))}</small><MessageTranslation message={m}/></div></div>))}<label>{tr("Сообщение")}<textarea rows={3} maxLength={2000} value={body} onChange={e => setBody(e.target.value)}/></label><Button busy={busy} disabled={!body.trim()} onClick={() => void run('message', { appointment_id: a.id, body }, 'Сообщение отправлено').then(r => { if (r)
        setBody(''); })}>{tr("Отправить")}</Button><CareError error={error}/></div></Modal>
 </article>;
}
export function MaterialContent({ m, familyToken }: {
    m: Partial<Material>;
    familyToken?: string;
}) { useLocale(); const [video, setVideo] = useState(false); const assets = useQuery({ queryKey: ['material-assets', m.video_url, m.memo_url, m.captions_ru, m.captions_kk, familyToken], queryFn: () => Promise.all([m.video_url, m.memo_url, m.captions_ru, m.captions_kk].map(path => resolveMaterialMedia(path, familyToken))), staleTime: 45000, refetchInterval: false }); return <div className="stack"><p>{tr(m.goal)}</p>{tr(m.is_demo && <Notice>{tr("Технический материал, а не профессиональное упражнение. Для настоящих назначений нужны проверенные материалы специалиста.")}</Notice>)}<p>{tr("Необходимо: ")}{tr(m.items?.join(', ') || 'Уточните у специалиста')}</p>{tr(m.video_url && <>{youtubeId(m.video_url)?<a className="btn secondary" href={'https://www.youtube.com/watch?v='+youtubeId(m.video_url)} target="_blank" rel="noopener noreferrer">{tr('Смотреть видео')}</a>:<Button variant="secondary" onClick={() => setVideo(!video)}>{tr(video ? 'Скрыть видео' : 'Смотреть видео')}</Button>}{tr(video && youtubeId(m.video_url) ? <SafeVideo url={m.video_url!}/> : video && <video controls playsInline crossOrigin="anonymous" preload="metadata" src={assets.data?.[0]}><track label={tr("Русский")} kind="subtitles" srcLang="ru" src={assets.data?.[2]} default/><track label={tr("Қазақша")} kind="subtitles" srcLang="kk" src={assets.data?.[3]}/></video>)}</>)}<ol>{tr(m.steps?.map((step, i) => <li key={i}>{tr(step)}</li>))}</ol><p><strong>{tr("Как понять, что получилось:")}</strong> {tr(m.signs)}</p><p><strong>{tr("Когда остановиться:")}</strong> {tr(m.stop)}</p>{tr(assets.data?.[1] && <a className="btn secondary" href={assets.data?.[1]} download target="_blank" rel="noreferrer">{tr("Скачать памятку")}</a>)}{tr(assets.isError && <p className="error" role="alert">{tr("Не удалось открыть защищённый файл материала. Попробуйте позже.")}</p>)}<p className="tiny muted">{tr("Выполняйте задание так, как показал ваш специалист.")}</p></div>; }
