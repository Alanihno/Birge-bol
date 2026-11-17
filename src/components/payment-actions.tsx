import { useEffect, useState } from 'react';
import { useApp } from '../lib/app-context';
import { mode, supabase } from '../lib/backend';
import type { CareAppointment } from '../domain/care';
import { useCareActions, timeLabel } from './care-ui';
import { Button, Modal, Notice } from './ui';
import { money } from '../domain/logic';
import { tr, useLocale } from '../lib/i18n';
export const paymentLabels: Record<string,string> = { awaiting_payment:'Забронировано, ждёт оплаты', payment_reported:'Оплата заявлена', confirmed:'Оплата подтверждена', expired:'Истекло', cancelled:'Отменено' };
export function ReceiptUpload({ onChange }: { onChange: (path:string) => void }) {
    useLocale(); const app=useApp(); const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
    async function upload(file:File|undefined) {
        onChange('');setMessage('');if(!file||!app.userId)return;
        const extensions:Record<string,string>={'image/png':'png','image/jpeg':'jpg','application/pdf':'pdf'};
        const extension=extensions[file.type];
        if(!extension||file.size>8388608){setMessage('Выберите PNG, JPG или PDF размером до 8 МБ');return;}
        setBusy(true);
        try {
            const path=mode==='demo'?'demo-receipt:'+crypto.randomUUID()+'.'+extension:app.userId+'/'+crypto.randomUUID()+'.'+extension;
            if(mode!=='demo'){const result=await supabase!.storage.from('booking-receipts').upload(path,file,{contentType:file.type,upsert:false});if(result.error)throw Error('Не удалось загрузить чек. Повторите загрузку.');}
            onChange(path);setMessage(mode==='demo'?"чек выбран; настоящий файл никуда не отправлен.":'Чек загружен в закрытое хранилище');
        }catch(error){setMessage(error instanceof Error?error.message:'Не удалось загрузить чек');}finally{setBusy(false);}
    }
    return <label>{tr('Чек оплаты · PNG, JPG или PDF до 8 МБ')}<input type="file" accept="image/png,image/jpeg,application/pdf" disabled={busy} onChange={event=>void upload(event.target.files?.[0])}/>{tr(message&&<small role="status">{tr(message)}</small>)}{tr(busy&&<small role="status">{tr('Загружаем чек…')}</small>)}</label>;
}
export function PaymentActions({ appointment:a,provider=false,clinic=false }: {appointment:CareAppointment;provider?:boolean;clinic?:boolean}) {
    useLocale();const actions=useCareActions();const [receipt,setReceipt]=useState(''),[received,setReceived]=useState(false),[dialog,setDialog]=useState<'confirm'|'extend'|''>(''),[deadline,setDeadline]=useState(''),[now,setNow]=useState(Date.now()),[receiptUrl,setReceiptUrl]=useState(''),[error,setError]=useState('');
    useEffect(()=>{if(a.payment_state!=='awaiting_payment')return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[a.payment_state]);
    useEffect(()=>{if(!receiptUrl)return;const timer=setTimeout(()=>setReceiptUrl(''),55000);return()=>clearTimeout(timer);},[receiptUrl]);
    if(!a.payment_state)return null;
    const remaining=Math.max(0,Date.parse(a.payment_deadline||'')-now),minutes=Math.ceil(remaining/60000),parent=!provider&&!clinic;
    async function viewReceipt(){setError('');try{if(mode==='demo'){setError("Отметка о чеке сохранена.");return;}const result=await actions.run('payment_receipt',{appointment_id:a.id},'');if(!result?.path)throw Error('Чек пока не приложен');const url=await supabase!.storage.from('booking-receipts').createSignedUrl(String(result.path),60,{download:'receipt'});if(url.error)throw Error('Не удалось открыть чек');setReceiptUrl(url.data.signedUrl);}catch(error){setError(error instanceof Error?error.message:'Чек недоступен');}}
    function extend(){const value=Math.min(Date.parse(a.starts_at),Date.parse(a.payment_deadline!)+3600000);setDeadline(new Date(value).toLocaleString('sv-SE',{timeZone:'Asia/Almaty'}).replace(' ','T').slice(0,16));setDialog('extend');}
    return <section className="payment-box"><strong>{tr(paymentLabels[a.payment_state]||a.payment_state)} · {tr(money(a.payment_amount||0))}</strong>
        {tr(a.payment_state==='awaiting_payment'&&<><p>{tr('Оплатите до')} {tr(timeLabel(a.payment_deadline!))} · {tr(remaining>0?`${Math.floor(minutes/60)} ч ${minutes%60} мин`:'Срок закончился, сервер проверяет освобождение слота')}</p><p className="tiny muted">{tr('Оплата вне приложения, отдельно за это занятие. Реквизиты уточните у специалиста. После перевода приложите чек.')}</p>{tr(parent&&<div className="stack"><ReceiptUpload onChange={setReceipt}/><Button busy={actions.busy} disabled={!receipt||remaining<=0} onClick={()=>void actions.run('payment_claim',{appointment_id:a.id,receipt_path:receipt},'Оплата заявлена. Таймер заморожен.')}>{tr('Я оплатила')}</Button></div>)}</>)}
        {tr(a.payment_state==='payment_reported'&&<Notice>{tr('Таймер заморожен, слот остаётся за родителем. Специалист проверяет фактическое поступление денег.')}{tr(a.payment_review_overdue&&tr(' Проверка длится более 12 часов; специалист получил напоминание и отметку о просрочке.'))}</Notice>)}
        {tr(a.payment_state==='expired'&&<p>{tr('Слот освобождён. Можно выбрать свободное время и забронировать снова.')}</p>)}
        {tr((provider||clinic)&&['awaiting_payment','payment_reported'].includes(a.payment_state)&&<div className="row"><Button onClick={()=>{setReceived(false);setDialog('confirm');}}>{tr('Оплата получена')}</Button>{tr(a.payment_state==='awaiting_payment'&&Date.parse(a.payment_deadline!)<Date.parse(a.starts_at)&&<Button variant="secondary" onClick={extend}>{tr('Продлить бронь')}</Button>)}</div>)}
        {tr(a.payment_receipt_available&&!clinic&&<Button variant="ghost" busy={actions.busy} onClick={()=>void viewReceipt()}>{tr('Открыть чек')}</Button>)}{tr(receiptUrl&&<a className="btn secondary" href={receiptUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{tr('Скачать чек · ссылка на 60 секунд')}</a>)}
        {tr((error||actions.error)&&<p className="error" role="alert">{tr(error||actions.error)}</p>)}
        <Modal open={!!dialog} onOpenChange={value=>{if(!value)setDialog('');}} title={tr(dialog==='confirm'?'Подтвердить получение оплаты':'Продлить срок оплаты')}><div className="stack">{tr(dialog==='confirm'?<><p>{tr('Приложение не проверяет банковский перевод автоматически.')}</p><label className="checkbox"><input type="checkbox" checked={received} onChange={event=>setReceived(event.target.checked)}/>{tr('Я проверил(а): деньги за это занятие действительно поступили')}</label><Button busy={actions.busy} disabled={!received} onClick={()=>void actions.run('payment_confirm',{appointment_id:a.id,received:true},'Оплата подтверждена, запись закреплена').then(result=>{if(result)setDialog('');})}>{tr('Подтвердить оплату и запись')}</Button></>:<><label>{tr('Новый срок · Алматы')}<input type="datetime-local" value={deadline} onChange={event=>setDeadline(event.target.value)}/></label><p className="tiny muted">{tr('Позже прежнего срока, до начала занятия и не дальше 48 часов от текущего времени.')}</p><Button busy={actions.busy} onClick={()=>void actions.run('payment_extend',{appointment_id:a.id,deadline:deadline+':00+05:00'},'Бронь продлена').then(result=>{if(result)setDialog('');})}>{tr('Сохранить новый срок')}</Button></>)}<p className="error" role="alert">{tr(actions.error)}</p></div></Modal>
    </section>;
}
