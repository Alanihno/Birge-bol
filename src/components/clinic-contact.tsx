import { useState } from 'react';
import type { Clinic } from '../domain/care';
import { clinicContacts, phoneNumber, telegramName, whatsappLink, telegramLink } from '../domain/clinic-contacts';
import { tr, useLocale } from '../lib/i18n';
import { Button, Modal, Notice } from './ui';
export function ClinicContact({ clinic }: { clinic: Clinic }) {
    useLocale();
    const contact = clinicContacts(clinic.contacts);
    const [open, setOpen] = useState(false), [phone, setPhone] = useState(contact.whatsapp), [telegram, setTelegram] = useState(contact.telegram), [text, setText] = useState(''), [copied, setCopied] = useState(false), [error, setError] = useState('');
    const booking = `Здравствуйте! Хочу обратиться в ${clinic.name}. Подскажите, пожалуйста, какие специалисты принимают, стоимость и ближайшее свободное время? Нашла вашу клинику через Birge Bol.`;
    const cooperation = `Здравствуйте! Хотим обсудить сотрудничество вашей клиники с проектом Birge Bol — платформой поддержки родителей и специалистов. С кем можно связаться для короткой встречи или звонка?`;
    return <><Button variant="secondary" onClick={() => { setText(booking); setPhone(contact.whatsapp); setTelegram(contact.telegram); setCopied(false); setError(''); setOpen(true); }}>{tr('Написать в клинику')}</Button>
        <Modal open={open} onOpenChange={setOpen} title={tr('Сообщение в клинику')}><div className="stack">
            <strong>{tr(clinic.name)}</strong><p className="muted">{tr('Откроется ваш WhatsApp или Telegram. Сообщение отправляется от аккаунта, в который вы вошли; нажать «Отправить» нужно в мессенджере.')}</p>
            <div className="child-tabs"><Button variant="ghost" onClick={() => setText(booking)}>{tr('Запись на приём')}</Button><Button variant="ghost" onClick={() => setText(cooperation)}>{tr('Сотрудничество')}</Button></div>
            <label>{tr('Сообщение для клиники')}<textarea rows={6} maxLength={2000} value={text} onChange={event => { setText(event.target.value); setCopied(false); }}/></label>
            <label>{tr('WhatsApp клиники')}<input type="tel" value={phone} maxLength={32} placeholder="+7 …" onChange={event => setPhone(event.target.value)}/></label>
            <label>{tr('Telegram клиники')}<input value={telegram} maxLength={64} placeholder="@username" onChange={event => setTelegram(event.target.value)}/></label>
            {tr(phone && !phoneNumber(phone) && <p className="error">{tr('Укажите полный международный номер клиники')}</p>)}{tr(telegram && !telegramName(telegram) && <p className="error">{tr('Укажите username клиники или ссылку https://t.me/username')}</p>)}
            {tr(!phone && !telegram && <Notice>{tr('Клиника пока не указала мессенджеры. Можно ввести её контакт выше или выбрать нужный чат в мессенджере.')}</Notice>)}
            <Button variant="ghost" disabled={!text.trim()} onClick={() => void navigator.clipboard.writeText(text).then(() => setCopied(true), () => setError('Копирование недоступно. Выделите текст сообщения вручную.'))}>{tr(copied ? 'Текст скопирован' : 'Копировать текст')}</Button>
            {tr(text.trim() && (!phone || phoneNumber(phone)) && <a className="btn primary" href={whatsappLink(phone, text)} target="_blank" rel="noopener noreferrer">{tr(phone ? 'Открыть WhatsApp' : 'Выбрать чат в WhatsApp')}</a>)}
            {tr(text.trim() && (!telegram || telegramName(telegram)) && <a className="btn secondary" href={telegramLink(telegram, text)} target="_blank" rel="noopener noreferrer">{tr(telegram ? 'Открыть Telegram' : 'Выбрать чат в Telegram')}</a>)}
            {tr(error && <p role="alert">{tr(error)}</p>)}
        </div></Modal></>;
}
