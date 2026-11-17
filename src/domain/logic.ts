import { speechRoute } from './care';
import { z } from 'zod';
import type { Child, Feedback, Specialist } from './types';
export const RULE_VERSION='2026.11.demo.1';
export function recommendations(child:Child){
 if(child.age==='2–3'&&child.concerns.includes('speech'))return speechRoute;
 const list:{title:string;reason:string;specialty:string;action:string}[]=[];
 if(child.concerns.includes('speech')){list.push({title:'Обсудить развитие речи',reason:`Запрос «речь», возраст ${child.age} года. Логопед поможет уточнить особенности общения.`,specialty:'Логопед',action:'Найти логопеда'});list.push({title:'Задать вопрос о слухе',reason:'Обсудите со специалистом, нужна ли оценка слуха. Это один из вопросов, а не назначение.',specialty:'Сурдолог',action:'Посмотреть специалистов'});}
 if(child.concerns.some(c=>['learning','writing'].includes(c)))list.push({title:'Обсудить поддержку обучения',reason:'Специальный педагог поможет понять образовательные потребности.',specialty:'Специальный педагог',action:'Найти педагога'});
 if(child.concerns.some(c=>['behavior','attention','communication'].includes(c)))list.push({title:'Обсудить общение и нагрузку',reason:'Можно начать с консультации квалифицированного психолога.',specialty:'Психолог',action:'Найти психолога'});
 if(!list.length)list.push({title:'Начать с уточнения запроса',reason:'Обсудите наблюдения с квалифицированным специалистом. Анкета не определяет диагноз.',specialty:'',action:'Открыть каталог'});
 if(child.experience==='first'&&list.length<3)list.push({title:'Узнать о ПМПК',reason:'Уточните доступную образовательную поддержку в вашем городе. Условия определяет местная ПМПК.',specialty:'explain',action:'Что такое ПМПК?'});
 return list.slice(0,3);
}
export const normalize=(s:string)=>s.toLocaleLowerCase('ru').normalize('NFKC').replace(/ё/g,'е').trim().replace(/\s+/g,' ');
export function matchScore(s:Specialist,c:Child){return (s.ages.includes(c.age)?2:0)+c.concerns.filter(t=>s.concerns.includes(t)).length*3+(s.district===c.district?1:0);}
export function rating(values:number[],minimum=5){const valid=values.filter(v=>Number.isInteger(v)&&v>=1&&v<=5);return valid.length<minimum?null:Math.round(valid.reduce((a,b)=>a+b,0)/valid.length*10)/10;}
export function reviewDraft(f:Feedback){return `Контакт с ребёнком оцениваю на ${f.contact} из 5. Специалист ${f.adaptation==='yes'?'подстроился под ребёнка':f.adaptation==='partial'?'частично подстроился под ребёнка':'не подстроился под ребёнка'}. ${f.explained?'Мне объяснили ход занятия.':'Мне не объяснили ход занятия.'} ${f.goal?'Есть понятная цель на месяц.':'Пока нет понятной цели на месяц.'} ${f.comfortable?'Следующие шаги понятны.':'Хочу уточнить следующие шаги.'}`;}
export const money=(n:number)=>new Intl.NumberFormat('ru-KZ',{maximumFractionDigits:0}).format(n)+' ₸';
export function safeUrl(url:string|null){if(!url)return null;try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function anonymize(s:string){return s.replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[email удалён]').replace(/(?<!\d)\d{12}(?!\d)/g,'[ИИН удалён]').replace(/\+?\d[\d ()-]{8,}\d/g,'[номер удалён]').replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g,'[дата удалена]').replace(/(?:меня зовут|ребёнка зовут|ребенка зовут|фио)\s*[:—-]?\s*[А-ЯЁA-Z][а-яёa-z]+(?:\s+[А-ЯЁA-Z][а-яёa-z]+){0,2}/gi,'[имя удалено]');}
export const questionSchema=z.object({title:z.string().trim().min(8,'Не меньше 8 символов').max(120,'Не больше 120 символов'),body:z.string().trim().min(20,'Добавьте немного подробностей: от 20 символов').max(1200,'Не больше 1200 символов'),topic:z.string().min(1),consent:z.literal(true,{error:'Нужно согласие на передачу обезличенного вопроса'})});
export type QuestionInput=z.infer<typeof questionSchema>;
