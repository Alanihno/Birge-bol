import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useNavigationGraph } from '../lib/navigation-graph';
import { searchGraph } from '../domain/navigation-graph';
import { Button, Modal } from './ui';
import { tr, useLocale } from '../lib/i18n';
export function SectionGuide() {
    useLocale(); const graph=useNavigationGraph();const [open,setOpen]=useState(false),[query,setQuery]=useState('');
    const rows=graph.data?searchGraph(graph.data,query):[];
    return <><Button className="section-guide-button" variant="secondary" onClick={()=>setOpen(true)} aria-label={tr('Помощник по разделам')}><MessageCircle size={20}/><span>{tr('Куда перейти?')}</span></Button><Modal open={open} onOpenChange={setOpen} title={tr('Помощник по разделам')}><div className="stack"><p>{tr('Подскажу, где найти нужную функцию. Записи и данные я не меняю.')}</p><label>{tr('Что хотите сделать?')}<input value={query} onChange={event=>setQuery(event.target.value)} placeholder={tr('Например: оплатить или оставить отзыв')}/></label>{tr(graph.isPending&&<p role="status">{tr('Загружаем карту разделов…')}</p>)}{tr(graph.isError&&<Button variant="secondary" onClick={()=>void graph.refetch()}>{tr('Повторить загрузку разделов')}</Button>)}{tr(rows.map(row=><Link className="btn secondary" key={row.id} to={row.route||'/data-map'} onClick={()=>setOpen(false)}>{tr(row.label)} →</Link>))}{tr(graph.data&&!rows.length&&<><p>{tr('Попробуйте: запись, оплата, дети, задания или QR.')}</p><Button variant="ghost" onClick={()=>setQuery('')}>{tr('Показать все разделы')}</Button></>)}<Link to="/data-map" className="text-link" onClick={()=>setOpen(false)}>{tr('Посмотреть карту связей →')}</Link><small className="muted">{tr('Разделы и ключевые слова связаны в базе. Навигация работает без ИИ и расхода токенов.')}</small></div></Modal></>;
}
