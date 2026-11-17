import CommunityFeed from '../components/community-feed';
import { communityTopics } from '../domain/community-feed';
import { MessageTranslation } from '../components/message-translation';
/* localized-copy */
import { tr, useLocale } from '../lib/i18n';
import { ThreadReplies } from '../components/threads';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { repository } from '../lib/repository';
import { useApp } from '../lib/app-context';
import { mode } from '../lib/backend';
import { anonymize, questionSchema } from '../domain/logic';
import type { QuestionInput } from '../domain/logic';
import { Back, Button, Empty, Loading, Notice, PageHeading } from '../components/ui';
export function Moms(){return <CommunityFeed/>;}
export function Ask() {
    useLocale();
    const { userId, refresh, notify } = useApp();
    const navigate = useNavigate();
    const [preview, setPreview] = useState<QuestionInput | null>(null);
    const [confirmed, setConfirmed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const { register, handleSubmit, formState: { errors } } = useForm<QuestionInput>({ resolver: zodResolver(questionSchema), defaultValues: { topic: 'Речь' } });
    async function submit() { if (!userId || !preview || !confirmed)
        return; setBusy(true); setError(''); const id = crypto.randomUUID(); try {
        await repository.ask(userId, { id, title: preview.title, body: preview.body, topic: preview.topic, city: 'Алматы', status: mode === 'demo' ? 'answered' : 'pending_moderation', is_demo: mode === 'demo', created_at: new Date().toISOString(), answers: mode === 'demo' ? [{ id: crypto.randomUUID(), body: "Это заранее подготовленный ответ, не отправка в Telegram: составьте список вопросов и обсудите со специалистом, как будет проходить знакомство и что поможет ребёнку чувствовать себя спокойнее.", is_demo: true }] : [] });
        await refresh();
        notify(mode === 'demo' ? "вопрос сохранён локально" : 'Вопрос передан на модерацию');
        navigate(`/moms/questions/${id}`);
    }
    catch {
        setError('Вопрос не отправлен. Проверьте соединение и повторите.');
    }
    finally {
        setBusy(false);
    } }
    return <div className="narrow"><Back /><PageHeading eyebrow={tr("ОПЫТ И ПОДДЕРЖКА")} title={tr(preview ? 'Проверьте перед отправкой' : 'Спросить мам')} description={tr("Не указывайте имена, ИИН, адрес, телефоны, диагноз и другие узнаваемые детали.")}/><Notice>{tr("Не добавляйте имена, документы и медицинские подробности в публичную ветку. Проверьте текст перед публикацией.")}</Notice>{tr(!preview ? <form className="panel stack" onSubmit={handleSubmit(v => { setPreview({ ...v, title: anonymize(v.title), body: anonymize(v.body) }); setConfirmed(false); })}><label>{tr("Тема")}<select {...register('topic')}>{tr(communityTopics.map(t => <option key={t} value={t}>{tr(t)}</option>))}</select></label><label>{tr("Короткий вопрос")}<input {...register('title')} maxLength={120} placeholder={tr("Как подготовиться к первому занятию?")}/>{tr(errors.title && <span className="error">{tr(errors.title.message)}</span>)}</label><label>{tr("Что хочется узнать")}<textarea {...register('body')} rows={5} maxLength={1200} placeholder={tr("Опишите ситуацию без личных подробностей…")}/>{tr(errors.body && <span className="error">{tr(errors.body.message)}</span>)}</label><label className="checkbox"><input type="checkbox" {...register('consent')}/>{tr("Согласен передать обезличенный вопрос для модерации и ответа.")}</label>{tr(errors.consent && <span className="error">{tr(errors.consent.message)}</span>)}<Button>{tr("Посмотреть перед отправкой")}<ArrowRight size={17}/></Button></form> : <div className="panel stack"><span className="subtle-badge">{tr(preview.topic)}{tr("\u00B7 без профиля ребёнка")}</span><h2>{tr(preview.title)}</h2><p className="prewrap">{tr(preview.body)}</p><label className="checkbox"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>{tr("Проверил текст: он и не содержит личных данных.")}</label><Notice>{tr(mode === 'demo' ? "Вопрос и заранее подготовленный ответ сохранятся только в локальном режиме этого браузера." : 'Вопрос будет виден вам и модераторам до проверки.')}{tr("Отправка в Telegram отключена.")}</Notice>{tr(error && <p role="alert" className="error">{tr(error)}</p>)}<div className="form-actions"><Button variant="secondary" onClick={() => setPreview(null)}>{tr("Редактировать")}</Button><Button disabled={!confirmed || busy} onClick={() => void submit()}>{tr(mode === 'demo' ? "Сохранить вопрос" : 'Передать на модерацию')}</Button></div></div>)}</div>;
}
export function QuestionPage() {
    useLocale();
    const { id } = useParams();
    const { data: personal, userId, refresh, notify } = useApp();
    const navigate = useNavigate();
    const { data: questions = [], isPending } = useQuery({ queryKey: ['questions'], queryFn: () => repository.questions() });
    const q = personal.questions.find(x => x.id === id) || questions.find(x => x.id === id);
    const own = personal.questions.some(x => x.id === id);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [busy, setBusy] = useState(false);
    async function remove() { if (!userId || !q)
        return; setBusy(true); try {
        await repository.removeQuestion(userId, q.id);
        await refresh();
        navigate('/moms');
    }
    catch {
        notify('Не удалось удалить вопрос');
    }
    finally {
        setBusy(false);
    } }
    if (!q)
        return isPending ? <Loading /> : <Empty title={tr("Вопрос не найден")} description={tr("Он может быть удалён или пока недоступен.")} to="/moms" label={tr("К вопросам")}/>;
    return <div className="narrow"><Back /><div className="panel stack"><span className="subtle-badge">{tr(q.is_demo ? "вопрос" : 'Ваш вопрос')} · {tr(q.topic)}</span><h1>{tr(q.title)}</h1><MessageTranslation message={{id:q.id,body:q.body}} kind="question"/><span className="muted">{tr(q.status === 'pending_moderation' ? 'На модерации' : q.status === 'answered' ? 'Есть ответ' : 'Вопрос открыт')}</span>{tr(own && (confirmDelete ? <div className="form-actions"><Button variant="danger" disabled={busy} onClick={() => void remove()}>{tr("Подтвердить удаление")}</Button><Button variant="ghost" onClick={() => setConfirmDelete(false)}>{tr("Отмена")}</Button></div> : <Button variant="ghost" onClick={() => setConfirmDelete(true)}>{tr("Удалить мой вопрос")}</Button>))}</div>{tr(!q.answers.length && <Notice>{tr("Ответов пока нет. Уведомление появится в приложении, когда ответ будет добавлен.")}</Notice>)}<ThreadReplies threadId={q.id} answers={q.answers} showExample={q.topic !== 'Новости'}/><p className="tiny muted">{tr("Ответ не является медицинской консультацией.")}</p></div>;
}
