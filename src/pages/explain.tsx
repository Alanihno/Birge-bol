/* localized-copy */
import { tr, useLocale } from '../lib/i18n';
import { useState } from 'react';
import { cachedExplanation, cacheExplanation } from '../lib/explanation-cache';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, Search, ArrowRight } from 'lucide-react';
import { terms } from '../domain/data';
import { normalize, anonymize } from '../domain/logic';
import { useApp } from '../lib/app-context';
import { mode, supabase } from '../lib/backend';
import { Button, Empty, Notice, PageHeading } from '../components/ui';
export default function Explain() {
    useLocale();
    const { userId } = useApp();
    const [aiBusy, setAiBusy] = useState(false);
    const [aiMessage, setAiMessage] = useState('');
    const [aiResult, setAiResult] = useState<{
        term: string;
        meaning: string;
    } | null>(null);
    const [params] = useSearchParams();
    const [query, setQuery] = useState(params.get('q') || '');
    const [selected, setSelected] = useState(params.get('q') || 'ЗРР');
    const [fragment, setFragment] = useState('');
    const [found, setFound] = useState<string[] | null>(null);
    const results = terms.filter(t => normalize(t.term + ' ' + t.title + ' ' + tr(t.term) + ' ' + tr(t.title)).includes(normalize(query)));
    const item = terms.find(t => t.term === selected);
    async function simplify() { if (!item || !supabase || !userId)
        return; const chosen = item.term; const cached = cachedExplanation(chosen); if (cached) { setAiResult({ term: chosen, meaning: cached }); setAiMessage('Сохранённое объяснение: повторного запроса к ИИ нет.'); return; } setAiBusy(true); setAiMessage(''); try {
        const { data, error } = await supabase.functions.invoke('explain', { body: { term: chosen } });
        if (error || !data || typeof data.meaning !== 'string')
            throw Error('unavailable');
        if (data.provider === 'gemini') {
            cacheExplanation(chosen, data.meaning);
            setAiResult({ term: chosen, meaning: data.meaning });
        }
        else {
            setAiResult(null);
            setAiMessage('ИИ недоступен, отключён или достигнут лимит. Исходный словарь продолжает работать.');
        }
    }
    catch {
        setAiMessage('Не удалось получить ответ ИИ. Исходное объяснение сохранено.');
    }
    finally {
        setAiBusy(false);
    } }
    return <><PageHeading eyebrow={tr("ПОНЯТНЫМ ЯЗЫКОМ")} title={tr("За сложными словами \u2014 смысл")} description={tr("Общие объяснения, которые помогут подготовиться к разговору со специалистом.")}/><Notice>{tr("Словарь работает локально, без ИИ. Материалы — черновики, требующие профессиональной проверки. Они не заменяют диагностику и не назначают лечение.")}</Notice><div className="explain-grid"><aside><div className="search-input"><Search size={18}/><input aria-label={tr("Поиск термина")} value={query} onChange={e => setQuery(e.target.value)} placeholder={tr("Например, ЗРР или ПМПК")}/></div><div className="term-list">{tr(results.map(t => <button className={selected === t.term ? 'selected' : ''} key={t.term} onClick={() => setSelected(t.term)}><span>{tr(t.term)}<small>{tr(t.title)}</small></span><ArrowRight size={16}/></button>))}{tr(!results.length && <p className="muted">{tr("Такого термина пока нет в словаре.")}</p>)}</div></aside><div>{tr(item ? <article className="panel term-detail"><span className="small-icon lilac"><BookOpen size={27}/></span><div className="eyebrow">{tr("РАЗБЕРЁМСЯ ВМЕСТЕ")}</div><h1>{tr(item.term)}</h1><h3>{tr(item.title)}</h3><p className="term-meaning">{tr(item.meaning)}</p>{tr(mode === 'supabase' && <div className="stack">{tr(userId ? <Button variant="secondary" disabled={aiBusy} onClick={() => void simplify()}>{tr(aiBusy ? 'Упрощаем…' : 'Объяснить проще с Gemini')}</Button> : <Link className="text-link" to="/auth?next=/explain">{tr("Войти для серверного объяснения с Gemini")}</Link>)}<p className="tiny muted">{tr("Передаётся только выбранный термин из словаря. Текст из поля ниже, сведения ребёнка и документы не отправляются.")}</p>{tr(aiMessage && <Notice>{tr(aiMessage)}</Notice>)}{tr(aiResult?.term === item.term && <Notice><strong>{tr("Автоматическое перефразирование")}</strong><p>{tr(aiResult.meaning)}</p>{tr("Проверьте смысл со специалистом. Это не диагностика.")}</Notice>)}</div>)}<div className="term-questions"><h3>{tr("Что спросить у специалиста")}</h3>{tr(item.questions.map((q, i) => <div key={q}><span>0{tr(i + 1)}</span><p>{tr(q)}</p></div>))}</div><p className="tiny muted">{tr("Версия словаря 2026.11 \u00B7 требует утверждения экспертом")}</p></article> : <Empty title={tr("Выберите термин")} description={tr("Найдите нужное слово слева.")}/>)}<div className="panel stack"><h3>{tr("Найти термины во фрагменте")}</h3><p className="muted">{tr("Только пример до 600 символов. Не вставляйте настоящее заключение, ФИО, ИИН, адрес или дату рождения. Текст не сохраняется и не передаётся на сервер.")}</p><label><span className="sr-only">{tr("фрагмент")}</span><textarea rows={3} maxLength={600} value={fragment} onChange={e => setFragment(e.target.value)} placeholder={tr("пример: обсудить ЗРР и консультацию логопеда")}/></label><Button variant="secondary" disabled={!fragment.trim()} onClick={() => { const text = normalize(anonymize(fragment)); setFound(terms.filter(t => text.includes(normalize(t.term))).map(t => t.term)); }}>{tr("Найти в словаре ")}<Search size={16}/></Button>{tr(found !== null && <div>{tr(found.length ? found.map(f => <button className="chip" key={f} onClick={() => { setSelected(f); setQuery(''); }}>{tr(f)}</button>) : <p>{tr("Точного совпадения нет. Попробуйте найти слово в словаре или уточнить у специалиста.")}</p>)}</div>)}<p className="tiny muted">{tr(mode === 'demo' ? "Словарь доступен без подключения к ИИ." : 'Gemini доступен отдельно для выбранного термина после входа. Свободный фрагмент остаётся локальным.')}</p></div></div></div></>;
}
