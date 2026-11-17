/* localized-copy */
import { tr, useLocale, locale } from '../lib/i18n';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Shield, Sprout, Users, Search } from 'lucide-react';
import { useApp } from '../lib/app-context';
import { mode } from '../lib/backend';
import { repository } from '../lib/repository';
import { concernLabels, districts } from '../domain/data';
import type { Concern } from '../domain/types';
import { Button, Notice, Back } from '../components/ui';
export function Welcome() { useLocale(); return <div className="welcome"><div className="welcome-illustration" aria-hidden="true"><div className="welcome-circle"><Sprout size={88} strokeWidth={1}/></div><span>✳</span><span>✦</span></div><div className="eyebrow">{tr("BIRGE BOL \u00B7 БЫТЬ РЯДОМ")}</div><h1>{tr("У каждого ребёнка")}<br />{tr("свой путь. ")}<em>{tr("Вы рядом.")}</em></h1><p>{tr("Найдите подходящую поддержку, разберитесь в рекомендациях и планируйте встречи вместе.")}</p><div className="welcome-actions"><Link className="btn coral" to="/onboarding">{tr("Начать поиск ")}<ArrowRight size={18}/></Link><Link className="btn secondary" to="/find">{tr("Посмотреть каталог")}</Link></div><div className="welcome-features"><div><Search /><strong>{tr("Найти")}</strong><span>{tr("Специалиста под ваш запрос")}</span></div><div><Users /><strong>{tr("Понять")}</strong><span>{tr("Через понятные слова и опыт мам")}</span></div><div><Sprout /><strong>{tr("Замечать")}</strong><span>{tr("Приёмы в личном календаре")}</span></div></div><details><summary>{tr("Как это работает")}</summary><p>{tr("Короткая анкета → примерные шаги → каталог → вопросы и календарь. Для основных функций войдите или откройте аккаунт.")}</p></details><Notice>{tr("Информация помогает подготовить вопросы к встрече и не заменяет консультацию специалиста.")}</Notice></div>; }
export function Onboarding() {
    useLocale();
    const app = useApp();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [step, setStep] = useState(0);
    const [value, setValue] = useState(() => params.has('new') ? { ...app.draft, id: crypto.randomUUID(), label: "Профиль" } : { ...app.activeChild });
    const [consent, setConsent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const titles = ['Сколько лет ребёнку?', 'Где искать поддержку?', 'Что хочется обсудить?', 'Уже обращались за помощью?', 'Как вам удобнее?'];
    function update(patch: Partial<typeof value>) { const next = { ...value, ...patch }; setValue(next); app.setDraft(next); }
    async function finish() { app.setDraft(value); if (app.userId && consent) {
        setBusy(true);
        try {
            const id = params.has('new') ? value.id : app.data.children.find(c => c.id === value.id) ? value.id : crypto.randomUUID();
            await repository.saveChild(app.userId, { ...value, id });
            await app.refresh();
            app.setActive(id);
        }
        catch {
            setError('Профиль не сохранён. Попробуйте ещё раз.');
            setBusy(false);
            return;
        }
    } const search = new URLSearchParams({ district: value.district, budget: String(value.budget), age: value.age }); if (value.concerns.includes('speech'))
        search.set('specialty', 'Логопед'); if (value.format === 'online')
        search.set('online', '1'); navigate('/find?' + search.toString()); }
    return <div className="narrow"><Back /><div className="eyebrow">{tr("ДАВАЙТЕ ПОЗНАКОМИМСЯ")}</div><div className="onboarding-progress"><span>{tr("Шаг ")}{tr(step + 1)}{tr("из 5")}</span><span>{tr("Около минуты")}</span></div><progress max={5} value={step + 1}/><h1>{tr(titles[step])}</h1><p className="muted">{tr("Для примера используйте профиль. Имя и диагноз не нужны.")}</p><div className="panel onboarding-panel">{tr(step === 0 && <div className="choice-grid">{tr(['2–3', '4–5', '6–8', '9–12'].map(age => <button className={`choice ${value.age === age ? 'chosen' : ''}`} key={age} onClick={() => update({ age })}><Sprout size={23}/><strong>{tr(age)}{tr("лет")}</strong>{tr(value.age === age && <Check size={18}/>)}</button>))}</div>)}{tr(step === 1 && <div className="stack"><label>{tr("Город")}<select value={value.city} onChange={e => update({ city: e.target.value })}><option value={"Алматы"}>{tr("Алматы")}</option></select></label><label>{tr("Район")}<select value={value.district} onChange={e => update({ district: e.target.value })}>{tr(districts.map(d => <option key={d} value={d}>{tr(d)}</option>))}</select></label><p className="tiny muted">{tr("Каталог пилотного города. Геолокация не запрашивается.")}</p></div>)}{tr(step === 2 && <div className="choice-grid">{tr(Object.entries(concernLabels).map(([key, label]) => <button key={key} aria-pressed={value.concerns.includes(key as Concern)} className={`choice ${value.concerns.includes(key as Concern) ? 'chosen' : ''}`} onClick={() => update({ concerns: value.concerns.includes(key as Concern) ? value.concerns.filter(c => c !== key) : [...value.concerns, key as Concern] })}>{tr(label)}{tr(value.concerns.includes(key as Concern) && <Check size={18}/>)}</button>))}</div>)}{tr(step === 3 && <div className="stack">{tr([['first', 'Пока нет, мы в начале пути'], ['visited', 'Уже были у специалистов'], ['conclusion', 'Есть заключение, хочу разобраться']].map(([key, label]) => <button key={key} className={`choice ${value.experience === key ? 'chosen' : ''}`} onClick={() => update({ experience: key })}>{tr(label)}</button>))}<p className="tiny muted">{tr("Документы и диагноз загружать не нужно.")}</p></div>)}{tr(step === 4 && <div className="stack"><label>{tr("Бюджет за занятие: до ")}{tr(value.budget.toLocaleString(locale()))} ₸<input type="range" min={8000} max={30000} step={1000} value={value.budget} onChange={e => update({ budget: Number(e.target.value) })}/></label><label>{tr("Формат")}<select value={value.format} onChange={e => update({ format: e.target.value })}><option value="any">{tr("Любой")}</option><option value="offline">{tr("Очно")}</option><option value="online">{tr("Онлайн")}</option></select></label>{tr(app.userId && <label className="checkbox"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/>{tr("Сохранить профиль в")}{tr(mode === 'demo' ? "локальном локальном режиме" : 'Supabase')}{tr(". Понимаю, что реальные сведения использовать нельзя.")}</label>)}</div>)}{tr(error && <p role="alert" className="error">{tr(error)}</p>)}<div className="form-actions"><Button variant="ghost" onClick={() => step > 0 ? setStep(step - 1) : navigate('/find')}>{tr(step ? 'Назад' : 'Пропустить')}</Button><Button disabled={busy || (step === 2 && value.concerns.length === 0)} onClick={() => step < 4 ? setStep(step + 1) : void finish()}>{tr(step === 4 ? 'Показать подходящие шаги' : 'Продолжить')}<ArrowRight size={17}/></Button></div></div><p className="privacy-inline"><Shield size={14}/>{tr("Анкета помогает с поиском, но не заменяет консультацию.")}</p></div>;
}
export { default as Auth } from './auth';
