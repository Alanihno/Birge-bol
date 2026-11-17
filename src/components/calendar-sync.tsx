import { useState } from 'react';
import { useApp } from '../lib/app-context';
import { careCommand, useCare } from '../lib/care-api';
import { mode } from '../lib/backend';
import { Button, Modal, Notice } from './ui';
import { tr, useLocale } from '../lib/i18n';
import { renderCalendar } from '../../supabase/functions/_shared/ical';
export function CalendarSync() {
    useLocale(); const app = useApp(), care = useCare();
    const [open, setOpen] = useState(false), [url, setUrl] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
    async function link(revoke = false) {
        if (!app.userId) return;
        setBusy(true); setMessage('');
        try { const result = await careCommand(app.userId, 'calendar_link', { revoke }); if (revoke) { setUrl(''); setMessage('Прежняя ссылка отключена. Уже импортированные в Google события могут остаться до обновления календаря.'); } else setUrl(import.meta.env.VITE_SUPABASE_URL + '/functions/v1/calendar-feed?token=' + result.token); }
        catch (error) { setMessage(error instanceof Error ? error.message : 'Не удалось подключить календарь'); }
        finally { setBusy(false); }
    }
    function download() {
        const events = (care.data?.appointments || []).filter(event => ['pending','confirmed','rescheduled','attended','completed','cancelled','expired'].includes(event.status)).map(event => ({ ...event, title:'Приём · Birge Bol', updated_at:event.updated_at || event.starts_at }));
        const blob = new Blob([renderCalendar(events)], {type:'text/calendar;charset=utf-8'}), objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a'); anchor.href=objectUrl;anchor.download='birge-bol.ics';anchor.click();setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
    }
    return <><Button variant="secondary" onClick={() => setOpen(true)}>{tr('Google Календарь')}</Button><Modal open={open} onOpenChange={setOpen} title={tr('Google Календарь')}><div className="stack"><p>{tr('Подключите расписание Birge Bol по ссылке. Новые записи, переносы и отмены будут поступать в Google при обновлении подписки. Изменения в Google не меняют запись в Birge Bol.')}</p>
        {tr(mode === 'demo' ? <Notice>{tr("Скачайте файл календаря или подключите подписку в своём аккаунте.")}</Notice> : <><Button busy={busy} onClick={() => void link()}>{tr(url ? 'Создать новую ссылку вместо прежней' : 'Создать ссылку для Google')}</Button>{tr(url && <><label>{tr('Секретная ссылка календаря')}<input readOnly value={url}/></label><Button variant="secondary" onClick={() => void navigator.clipboard.writeText(url).then(() => setMessage('Ссылка скопирована'), () => setMessage('Выделите и скопируйте ссылку вручную'))}>{tr('Копировать ссылку')}</Button><ol><li>{tr('На компьютере откройте Google Календарь.')}</li><li>{tr('Другие календари → «+» → Добавить по URL.')}</li><li>{tr('Вставьте ссылку и добавьте календарь.')}</li></ol><a className="btn secondary" href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl" target="_blank" rel="noopener noreferrer">{tr('Открыть Google Календарь')}</a></>)}<Button variant="ghost" busy={busy} onClick={() => void link(true)}>{tr('Отключить подписку')}</Button><small className="muted">{tr('Только время и общий заголовок приёма, без имён детей и диагнозов. Тот, у кого есть ссылка, сможет видеть эти события. Ссылка действует год; её можно отключить. Частоту обновления определяет Google, поэтому изменения появляются с задержкой.')}</small></>)}
        <p className="tiny muted">{tr('Создание новой ссылки отключает прежнюю. Если календарь уже подключён, замените ссылку в Google.')}</p><Button variant="secondary" onClick={download}>{tr('Скачать .ics один раз')}</Button>{tr(message && <p role="status">{tr(message)}</p>)}
    </div></Modal></>;
}
