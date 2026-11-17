import { useEffect, useRef, useState } from 'react';
import { mode, supabase } from '../lib/backend';
import { useLocale, tr } from '../lib/i18n';


export function MessageTranslation({message,kind='message'}:{message:{id:string;body:string};kind?:'message'|'reply'|'team'|'question'|'answer'|'review'}){
 const lang=useLocale(),[translated,setTranslated]=useState(''),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const request=useRef(0);
 useEffect(()=>{request.current++;setTranslated('');setShow(false);setError('');setBusy(false);return ()=>{request.current++;};},[message.id,message.body,lang,kind]);
 async function translate(){if(translated){setShow(!show);return;}const generation=++request.current;setBusy(true);setError('');try{
  if(mode==='demo')throw Error(tr('Для перевода нужен вход в подключённый аккаунт.'));
  const r=await supabase!.functions.invoke('translate-message',{body:{message_id:message.id,target:lang,kind}});if(r.error||typeof r.data?.text!=='string')throw Error(tr('Перевод временно недоступен. Оригинал сообщения сохранён.'));
  if(generation===request.current){setTranslated(r.data.text);setShow(true);}
 }catch(e){if(generation===request.current)setError(e instanceof Error?e.message:tr('Не удалось перевести сообщение.'));}finally{if(generation===request.current)setBusy(false);}}
 return <div className="message-translation"><p className="prewrap">{show?translated:message.body}</p><button className="text-link" type="button" disabled={busy} aria-busy={busy} onClick={()=>void translate()}>{busy?tr('Переводим…'):show?tr('Показать оригинал'):lang==='kk'?'Аудару':'Перевести'}</button>{show&&<small className="muted">{tr('Автоматический перевод · при сомнениях проверьте оригинал')}</small>}{error&&<p className="error" role="alert">{error}</p>}</div>;
}
