import type {Locale} from './i18n';
export function pluralRu(n:number,forms:[string,string,string]){const value=Math.abs(n)%100,last=value%10;return value>=11&&value<=14?forms[2]:last===1?forms[0]:last>=2&&last<=4?forms[1]:forms[2];}
export const formatYears=(n:number,lang:Locale)=>`${n} ${lang==='kk'?'жыл':pluralRu(n,['год','года','лет'])}`;
export const formatExperience=(n:number,lang:Locale)=>`${lang==='kk'?'Еңбек өтілі':'Стаж'}: ${formatYears(n,lang)}`;
export const formatReviews=(n:number,lang:Locale)=>`${n} ${lang==='kk'?'расталған пікір':pluralRu(n,['подтверждённый отзыв','подтверждённых отзыва','подтверждённых отзывов'])}`;
export const formatRating=(n:number|null|undefined,lang:Locale)=>n==null?(lang==='kk'?'Әзірге пікір жоқ':'Пока нет отзывов'):n.toLocaleString(lang==='kk'?'kk-KZ':'ru-RU',{minimumFractionDigits:1,maximumFractionDigits:1});
