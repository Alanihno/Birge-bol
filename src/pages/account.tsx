import { caseGroups } from '../domain/ratings';
import { AddChildren } from '../components/add-children';
/* localized-copy */
import { tr, locale, useLocale } from '../lib/i18n';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/app-context';
import { repository } from '../lib/repository';
import { changeJourney, useJourney } from '../lib/journey';
import { AppointmentCalendar } from '../components/calendar';
import { Button, Notice, PageHeading } from '../components/ui';
export default function Account() {
    useLocale();
    const { userId, data, activeChild, refresh, setActive, notify } = useApp();
    const journey = useJourney();
    const [name, setName] = useState(journey.parentName);
    const [childName, setChildName] = useState(tr(activeChild.label));
    const [age, setAge] = useState(activeChild.age);
    useEffect(() => { setChildName(activeChild.label); setAge(activeChild.age); }, [activeChild.id, activeChild.label, activeChild.age]);
    const [caseGroup,setCaseGroup]=useState(activeChild.case_group||'unknown');
    useEffect(()=>setCaseGroup(activeChild.case_group||'unknown'),[activeChild.id,activeChild.case_group]);
    const [busy, setBusy] = useState(false);
    const docs = journey.documents.filter(d => d.childId === activeChild.id);
    async function save() { if (!userId)
        return; setBusy(true); try {
        await repository.saveChild(userId, { ...activeChild, label: childName, age, case_group:caseGroup });
        changeJourney(d => { d.parentName = name; });
        await refresh();
        notify("профиль сохранён");
    }
    catch {
        notify('Не удалось сохранить профиль');
    }
    finally {
        setBusy(false);
    } }
    function fill() { setName("Аружан"); setChildName("Алихан"); setAge('2–3'); }
    function addDocs() { changeJourney(d => { for (const [kind, name] of [['Заключение', "Заключение специалиста"], ['Направление', "Направление ПМПК"], ['История', "Прошлый приём"]])
        if (!d.documents.some(x => x.childId === activeChild.id && x.kind === kind))
            d.documents.push({ id: crypto.randomUUID(), childId: activeChild.id, kind, name }); }); notify("документы добавлены"); }
    return <><PageHeading eyebrow={tr("ЛИЧНОЕ ПРОСТРАНСТВО")} title={tr("Мой профиль")} description={tr("Анкета ребёнка, документы и ближайшие приёмы.")}/>{tr(!userId ? <Notice><Link to="/auth?next=/profile">{tr("Войти в аккаунт")}</Link>{tr(", чтобы заполнять профиль и записываться.")}</Notice> : <section className="panel stack account-form"><div className="section-title"><h2>{tr("Данные семьи")}</h2><Button variant="secondary" onClick={fill}>{tr("Заполнить данными")}</Button></div><p className="tiny muted">{tr("Используйте псевдоним ребёнка.")}</p>{tr(data.children.length > 1 && <label>{tr("Профиль ребёнка")}<select value={activeChild.id} onChange={e => { const child = data.children.find(c => c.id === e.target.value)!; setActive(child.id); setChildName(tr(child.label)); setAge(child.age); }}>{tr(data.children.map(c => <option key={c.id} value={c.id}>{tr(c.label)}</option>))}</select></label>)}<div className="account-fields"><label>{tr("Имя родителя")}<input maxLength={80} value={name} onChange={e => setName(e.target.value)}/></label><label>{tr("Имя ребёнка")}<input maxLength={80} value={childName} onChange={e => setChildName(e.target.value)}/></label><label>{tr("Возраст")}<select value={age} onChange={e => setAge(e.target.value)}>{tr(['2–3', '4–5', '6–8', '9–12'].map(a => <option key={a} value={a}>{tr(a)}</option>))}</select></label></div><label>{tr("Категория для похожих случаев (необязательно)")}<select value={caseGroup} onChange={e=>setCaseGroup(e.target.value)}>{tr(Object.entries(caseGroups).map(([value,label])=><option key={value} value={value}>{tr(label)}</option>))}</select></label><Button busy={busy} disabled={busy || !name.trim() || !childName.trim() } onClick={() => void save()}>{tr("Сохранить профиль")}</Button><AddChildren/></section>)}<AppointmentCalendar />{tr(userId && <section className="panel stack document-panel"><div className="section-title"><h2>{tr("Папка документов ребёнка")}</h2><Button variant="secondary" onClick={addDocs}>{tr("Добавить документы")}</Button></div><Notice>{tr("Это карточки документов. Настоящие файлы не загружаются. Эти примеры остаются в вашем браузере; передавать документы специалисту нужно отдельно.")}</Notice>{tr(docs.length ? docs.map(doc => <div className="document-row" key={doc.id}><div><strong>{tr(doc.name)}</strong><p className="tiny">{tr(doc.kind)}{tr("образец")}</p></div><Button variant="ghost" onClick={() => changeJourney(d => { d.documents = d.documents.filter(x => x.id !== doc.id); })}>{tr("Удалить")}</Button></div>) : <p className="muted">{tr("Добавьте пакет, чтобы посмотреть автоматическое прикрепление при записи.")}</p>)}<h3>{tr("История приёмов")}</h3>{tr(journey.bookings.filter(b => b.childId === activeChild.id && b.status === 'completed').map(b => <p key={b.id}>{tr(b.name)} · {tr(new Date(b.startsAt).toLocaleDateString(locale()))} · {tr(b.reviewed ? 'чек-лист заполнен' : 'ожидает отзыва')}</p>))}{tr(!journey.bookings.some(b => b.childId === activeChild.id && b.status === 'completed') && <p className="muted">{tr("Завершённых приёмов пока нет.")}</p>)}</section>)}</>;
}
