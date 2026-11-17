import { Mascot } from '../components/mascot/Mascot';
import { RatingInfo } from '../components/rating-info';
/* localized-copy */
import { tr, useLocale } from '../lib/i18n';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCareActions, CareError } from '../components/care-ui';
import { Button, Empty, Loading, ErrorState, Notice, PageHeading } from '../components/ui';
import { strengthLabels } from '../domain/care';
import { reviewDraft, anonymize } from '../domain/logic';
import type { Feedback } from '../domain/types';
export default function FeedbackPage() {
    useLocale();
    const { sessionId } = useParams(), care = useCareActions();
    const [answers, setAnswers] = useState<Feedback>({ contact: 0, adaptation: '', explained: false, goal: false, comfortable: false }), [answered, setAnswered] = useState<string[]>([]), [strengths, setStrengths] = useState<string[]>([]), [caseConsent,setCaseConsent]=useState(false), [extra, setExtra] = useState(''), [body, setBody] = useState(''), [preview, setPreview] = useState(false), [consent, setConsent] = useState(false), [done, setDone] = useState(false);
    if (care.isPending)
        return <Loading />;
    if (care.isError || !care.data)
        return <ErrorState retry={() => void care.refetch()}/>;
    const a = care.data.appointments.find(a => a.id === sessionId), review = care.data.reviews.find(r => r.appointment_id === sessionId);
    if (done)
        return <div className="narrow"><Mascot state="success" size="large"/><Notice tone="sage">{tr("Отзыв отправлен на модерацию. Посещение подтверждено")}{tr(a?.is_demo ? ' в тестовом сценарии' : '')}.</Notice><Link className="btn primary" to="/diary">{tr("Вернуться в дневник")}</Link></div>;
    if (!a?.visit_verified || a.status !== 'completed')
        return <Empty title={tr("Сначала подтвердите посещение")} description={tr("Отсканируйте QR специалиста в центре и подтвердите посещение.")} to="/diary" label={tr("Мои приёмы")}/>;
    if (review)
        return <Empty title={tr("Отзыв уже сохранён")} description={tr("Один подтверждённый приём — один отзыв.")} to="/diary" label={tr("Открыть дневник")}/>;
    const mark = (k: string) => setAnswered(v => [...new Set([...v, k])]);
    return <div className="narrow"><PageHeading eyebrow={tr("ПОСЕЩЕНИЕ ПОДТВЕРЖДЕНО")} title={tr(preview ? 'Ваш опыт — вашими словами' : 'Как прошло занятие?')} description={tr("Только ваши ответы и наблюдения. Без предположений о результате лечения.")}/><RatingInfo/><section className="panel stack">{tr(!preview ? <><label>{tr("Оценка контакта с ребёнком")}<select required value={answers.contact} onChange={e => { setAnswers({ ...answers, contact: Number(e.target.value) }); mark('contact'); }}><option value={0}>{tr("Выберите оценку")}</option>{tr([1, 2, 3, 4, 5].map(n => <option value={n} key={n}>{tr(n)}{tr("из 5")}</option>))}</select></label><label>{tr("Специалист подстроился под ребёнка?")}<select value={answers.adaptation} onChange={e => { setAnswers({ ...answers, adaptation: e.target.value }); mark('adaptation'); }}><option value="">{tr("Выберите ответ")}</option><option value="yes">{tr("Да")}</option><option value="partial">{tr("Частично")}</option><option value="no">{tr("Нет")}</option></select></label>{tr(([['explained', 'Объяснили ход занятия?'], ['goal', 'Согласовали понятную цель на месяц?'], ['comfortable', 'Понятны следующие шаги?']] as const).map(([key, title]) => <label key={key}>{tr(title)}<select value={answered.includes(key) ? String(answers[key]) : ''} onChange={e => { setAnswers({ ...answers, [key]: e.target.value === 'true' }); mark(key); }}><option value="">{tr("Выберите ответ")}</option><option value="true">{tr("Да")}</option><option value="false">{tr("Нет")}</option></select></label>))}<fieldset><legend>{tr("Что вы отметили? Необязательно")}</legend>{tr(strengthLabels.map(label => <label className="checkbox" key={label}><input type="checkbox" checked={strengths.includes(label)} onChange={e => setStrengths(e.target.checked ? [...strengths, label] : strengths.filter(x => x !== label))}/>{tr(label)}</label>))}</fieldset><label>{tr("Ваш отзыв — своими словами")}<textarea maxLength={1000} rows={4} value={extra} onChange={e => setExtra(e.target.value)} placeholder={tr("Можно оставить пустым")}/></label><Button disabled={answered.length < 5 || answers.contact < 1 || !answers.adaptation} onClick={() => { setBody(reviewDraft(answers) + (extra.trim() ? '\n\n' + extra.trim() : '')); setPreview(true); }}>{tr("Посмотреть черновик")}</Button></> : <><Notice>{tr("Составлено автоматически на основе ваших ответов")}</Notice><label>{tr("Предварительный просмотр · можно редактировать")}<textarea rows={10} minLength={10} maxLength={2000} value={body} onChange={e => setBody(e.target.value)}/></label><p className="tiny muted">{tr("Не добавляйте имена, диагнозы и контакты ребёнка. Перед публикацией текст проверит модератор.")}</p><label className="checkbox"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/>{tr("Согласен передать обезличенный отзыв на модерацию")}</label><label className="checkbox"><input type="checkbox" checked={caseConsent} onChange={e=>setCaseConsent(e.target.checked)}/>{tr("Разрешаю использовать обезличенные категорию случая, возрастную группу и формат для рейтинга похожих случаев. Без этого согласия отзыв участвует только в общем рейтинге.")}</label><Button busy={care.busy} disabled={!consent || body.trim().length < 10} onClick={() => void care.run('review', { appointment_id: a.id, ...answers, strengths, case_consent:caseConsent, body: anonymize(body) }, 'Спасибо за отзыв').then(r => { if (r)
        setDone(true); })}>{tr("Опубликовать отзыв")}</Button><Button variant="ghost" onClick={() => setPreview(false)}>{tr("Вернуться к ответам")}</Button></>)}<CareError error={care.error}/></section></div>;
}
