import { presentationCopy } from './presentation-copy';
import { useSyncExternalStore } from 'react';
import kk from '../locales/kk.json';
import contestKk from '../locales/kk-contest.json';
import contentKk from '../locales/kk-content.json';
import communityKk from '../locales/kk-community.json';
import prompt4Kk from '../locales/kk-prompt4.json';
import ru from '../locales/ru.json';
export type Locale='ru'|'kk';
let current:Locale=typeof localStorage!=='undefined'&&localStorage.getItem('bb-lang')==='kk'?'kk':'ru';
if(typeof location!=='undefined'){const url=new URL(location.href);const requested=url.searchParams.get('lang');if(requested==='kk'||requested==='ru'){current=requested;localStorage.setItem('bb-lang',current);url.searchParams.delete('lang');history.replaceState(history.state,'',url);}}
const listeners=new Set<()=>void>();
const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export function useLocale(){return useSyncExternalStore(subscribe,()=>current);}
export function locale(){return current==='kk'?'kk-KZ':'ru-RU';}
export function setLocale(value:Locale){current=value;localStorage.setItem('bb-lang',value);document.documentElement.lang=value;document.title=value==='kk'?'Birge Bol — бірге бол':'Birge Bol — быть рядом';listeners.forEach(fn=>fn());}
const translations:Record<string,string>={...kk,...contestKk,...contentKk,...communityKk,...prompt4Kk,'Оплата записей':'Қабылдауларды төлеу','Безопасность и поддержка':'Қауіпсіздік және қолдау','Центры и клиники':'Орталықтар мен клиникалар','Адреса, направления, специалисты и доступное время.':'Мекенжайлар, бағыттар, мамандар және бос уақыт.','Адреса и филиалы':'Мекенжайлар мен филиалдар','Специалисты центра':'Орталық мамандары','Все города':'Барлық қалалар','Ближайшее время':'Ең жақын уақыт','Время уточняется':'Уақыты нақтыланады','Центры пока не добавлены':'Орталықтар әлі қосылмаған','Оплаченные записи':'Төленген қабылдаулар','Оплата подтверждена':'Төлем расталды','Ближайшие приёмы':'Алдағы қабылдаулар'};
const revisions=ru as Record<string,string>;
const fragments=Object.keys(translations).filter(k=>k.length>2).sort((a,b)=>b.length-a.length);
const escaped=fragments.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
const fragmentPattern=new RegExp(escaped.join('|'),'gu');
const cache:Record<Locale,Map<string,string>>={ru:new Map(),kk:new Map()};
const months=['қаңтар','ақпан','наурыз','сәуір','мамыр','маусым','шілде','тамыз','қыркүйек','қазан','қараша','желтоқсан'];
export function tr<T>(value:T):T{
 if(typeof value!=='string'||!value.trim())return value;
 const existing=cache[current].get(value);if(existing!==undefined)return existing as T;
 const original=value.trim(),core=presentationCopy(original);
 let translated=current==='ru'?(revisions[core]??core):(translations[core]??core.replace(fragmentPattern,match=>translations[match]));
 if(current==='kk')translated=translated.replace(/\bM(0?[1-9]|1[0-2])\b/g,(_,month:string)=>months[Number(month)-1]);
 const prefix=value.slice(0,value.indexOf(original))||(/^(лет|года ·|км|из|из 5|ответов)$/.test(core)?' ':'');
 const result=prefix+presentationCopy(translated)+value.slice(value.indexOf(original)+original.length);
 if(cache[current].size>2000)cache[current].clear();cache[current].set(value,result);return result as T;
}
