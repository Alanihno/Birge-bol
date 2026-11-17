import { useQuery } from '@tanstack/react-query';
import { useApp } from '../lib/app-context';
import { qrDataUrl } from '../lib/qr';
import { Modal, Notice } from './ui';
import { tr, useLocale } from '../lib/i18n';
export function VisitCodeDialog(){useLocale();const {visitCode,setVisitCode}=useApp();const url=visitCode?`${location.origin}/v/${visitCode.id.replaceAll('-','')}/${visitCode.code}`:'';const qr=useQuery({queryKey:['visit-qr',url],enabled:!!url,queryFn:()=>qrDataUrl(url)});return <Modal open={!!visitCode} onOpenChange={b=>{if(!b)setVisitCode(null);}} title={tr('Подтверждение посещения')}><div className="stack center">{tr(qr.data&&<img src={qr.data} width={224} height={224} alt={tr('QR-код подтверждения посещения')}/>)}<strong className="attendance-code">{tr(visitCode?.code)}</strong><p>{tr('Одноразовый код для родителя этой записи. Срок — 30 минут.')}</p><Notice>{tr('QR снижает риск накрутки, но не исключает сговор.')}</Notice>{tr(qr.isError&&<p className="muted">{tr('Используйте цифровой код.')}</p>)}</div></Modal>;}
