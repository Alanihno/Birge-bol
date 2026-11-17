import type { Child, Specialist } from './types';

export type Role = 'parent' | 'specialist' | 'clinic' | 'admin' | 'moderator' | 'mentor';
export const roleHome = (role: Role) => role === 'specialist' ? '/pro' : role === 'clinic' ? '/clinic' : role === 'admin' || role === 'moderator' ? '/admin' : '/app';
export const districtNames = ['Алатауский','Алмалинский','Ауэзовский','Бостандыкский','Жетысуский','Медеуский','Наурызбайский','Турксибский'];
export const demoAccounts = [
  { role: 'parent' as Role, email: 'parent@birge.example', label: 'Родитель', id: '20000000-0000-4000-8000-000000000001' },
  { role: 'specialist' as Role, email: 'specialist@birge.example', label: 'Специалист', id: '20000000-0000-4000-8000-000000000002' },
  { role: 'clinic' as Role, email: 'clinic@birge.example', label: 'Клиника', id: '20000000-0000-4000-8000-000000000003' },
];
export const demoPassword = 'BirgeDemo!2026';
export const statusLabels:Record<string,string> = { expired:'Истекло',pending:'Ожидает подтверждения', confirmed:'Подтверждена', rescheduled:'Перенесена', cancelled:'Отменена', attended:'Приём состоялся', completed:'Посещено', self_reported:'Личная отметка', active:'В процессе', done:'Выполнено', difficult:'Не получилось', new:'Новое' };
export type Slot = {id:string;specialist_id:string;starts_at:string;ends_at:string;service:string;price:number;available:boolean};
export type CareAppointment = {payment_state?:string;payment_amount?:number;payment_deadline?:string;payment_claimed_at?:string;payment_confirmed_at?:string;payment_review_overdue?:boolean;payment_receipt_available?:boolean;payment_receipt_path?:string;payment_provider_reminded?:boolean;payment_reminded?:boolean;payment_created_at?:string;id:string;parent_id:string;child_id:string;specialist_id:string;slot_id:string;starts_at:string;ends_at:string;status:string;service:string;reason?:string;contact?:string;share_diary?:boolean;diagnosis?:string;visit_verified:boolean;is_demo:boolean;clinic_id?:string;proposed_slot_id?:string|null;visited_at?:string;updated_at?:string;visit_format?:string;child_age?:string;child_district?:string};
export type Material = {id:string;author_id:string;title:string;goal:string;duration:number;items:string[];steps:string[];signs:string;stop:string;video_url:string|null;memo_url:string|null;captions_ru:string|null;captions_kk:string|null;status:string;is_demo:boolean;rights_confirmed:boolean};
export type Assignment = {id:string;parent_id:string;child_id:string;specialist_id:string;material_id:string;goal_id:string|null;goal_title:string;duration:number;frequency:string;due_at:string;comment:string;status:string;created_at:string};
export type Completion = {id:string;assignment_id:string;child_id:string;parent_id:string;specialist_id:string;outcome:string;comment:string;created_at:string};
export type Clinic = {id:string;owner_id:string;name:string;district:string;address:string;description:string;services:string;contacts:string;status:string;is_demo:boolean};
export type CareReview = {case_summary?:string|null;created_at?:string;case_consent?:boolean;case_age?:number;case_group?:string;visit_format?:string;id:string;appointment_id:string;parent_id:string;reviewer_key?:string;specialist_id:string;body:string;contact:number;strengths:string[];status:string;is_demo:boolean;visit_verified:boolean};
export type Message = {id:string;appointment_id:string;sender_id:string;body:string;created_at:string};
export type CareState = {payment_policy?:{unpaid_count:number;unpaid_limit:number;unpaid_cancellations:number;receipt_required:boolean};reliability?:{specialist_id:string;late_confirmations:number;score:number}[];role:Role;is_demo:boolean;specialists:Specialist[];slots:Slot[];appointments:CareAppointment[];patients:(Child & {diagnosis?:string})[];materials:Material[];assignments:Assignment[];completions:Completion[];clinics:Clinic[];members:{clinic_id:string;specialist_id:string;status:string}[];branches:{id:string;clinic_id:string;name:string;district:string;address:string}[];invitations:{id:string;clinic_id:string;email:string;status:string}[];reviews:CareReview[];messages:Message[];shares:{id:string;assignment_id:string;expires_at:string;revoked:boolean}[];history:{id:string;entity_id:string;action:string;created_at:string}[];rules:{id:string;title:string;explanation:string;conditions:Record<string,unknown>;approved:boolean;enabled:boolean}[];reports:{id:string;review_id:string;reason:string}[]};
export const emptyCare = ():CareState => ({role:'parent',is_demo:false,specialists:[],slots:[],appointments:[],patients:[],materials:[],assignments:[],completions:[],clinics:[],members:[],branches:[],invitations:[],reviews:[],messages:[],shares:[],history:[],rules:[],reports:[]});
export const strengthLabels = ['Хороший контакт с ребёнком','Интересные игровые форматы','Терпеливое отношение','Индивидуальный подход','Понятные объяснения родителям','Удобное расписание','Хорошая обратная связь','Поддерживающая атмосфера'];
export function strengthsFor(reviews:CareReview[],id:string,demo?:boolean) {
  const verified = reviews.filter(r=>r.specialist_id===id && (demo===undefined||r.is_demo===demo) && r.status==='verified' && r.visit_verified);
  return strengthLabels.map(label=>({label,count:new Set(verified.filter(r=>r.strengths.includes(label)).map(r=>r.reviewer_key||r.parent_id).filter(Boolean)).size})).filter(s=>s.count>=3).sort((a,b)=>b.count-a.count);
}
export const informationDisclaimer = 'Рекомендации носят информационный характер. Окончательное решение принимается квалифицированным специалистом';
export const speechRoute = [
 {title:'Оценка развития и консультация педиатра',reason:'Обсудить общее развитие, наблюдения семьи и дальнейшие обследования.',specialty:'',action:'Найти поддержку'},
 {title:'Проверка слуха',reason:'Обсудить с педиатром оценку слуха у сурдолога: слух важен для развития коммуникации.',specialty:'Сурдолог',action:'Найти сурдолога'},
 {title:'Консультация по показаниям',reason:'Педиатр определит, нужна ли консультация детского невролога или психиатра.',specialty:'',action:'Открыть каталог'},
 {title:'Возрастной скрининг развития',reason:'Уточнить у квалифицированного специалиста необходимость скрининга на РАС с подходящим возрасту утверждённым инструментом. Отсутствие речи само по себе не означает РАС.',specialty:'',action:'Открыть каталог'},
 {title:'Речь и коммуникация',reason:'Обсудить со специалистом понимание речи и доступные ребёнку способы выражать потребности.',specialty:'Логопед',action:'Найти логопеда'},
 {title:'Узнать о ПМПК',reason:'Уточнить образовательные потребности и доступную поддержку в местной ПМПК.',specialty:'explain',action:'Что такое ПМПК?'},
];
export function directions(child:Child) {
 if(child.concerns.includes('speech') && child.age==='2–3') return ['Понимание речи','Формирование взаимодействия','Подражание','Развитие коммуникации','Выражение потребностей доступными способами','Поддержка первых слов, если это соответствует индивидуальному плану'];
 if(child.concerns.includes('writing')) return ['Оценка письменной речи','Определение индивидуальных целей','Наблюдение за динамикой'];
 if(child.concerns.includes('speech')) return ['Оценка звукопроизношения','Индивидуальные цели по результатам оценки','Закрепление навыков по плану специалиста'];
 return ['Уточнение запроса семьи','Индивидуальные цели','Обсуждение наблюдений'];
}
export type Criterion = 'price'|'distance'|'contact'|'match'|'slots'|'experience';
export const criteriaLabels:Record<Criterion,string> = {price:'Цена',distance:'Расстояние',contact:'Контакт с ребёнком',match:'Опыт с похожими запросами',slots:'Свободные места',experience:'Стаж'};
export function compareSpecialists(list:Specialist[],child:Child,criteria:Criterion[],slots:Slot[],reviews:CareReview[],distances:Record<string,number>={}) {
 const values = list.map(s=>({s, price:-s.price,distance:distances[s.id]===undefined?null:-distances[s.id],contact:s.contact_rating,match:s.concerns.filter(c=>child.concerns.includes(c)).length+(s.ages.includes(child.age)?1:0),slots:slots.filter(x=>x.specialist_id===s.id&&x.available&&Date.parse(x.starts_at)>Date.now()).length,experience:s.experience}));
 const totals = values.map(v=>({id:v.s.id,points:0,reasons:[] as string[]}));
 for(const key of criteria){const valid=values.filter(v=>v[key]!==null);if(valid.length!==list.length)continue;const min=Math.min(...valid.map(v=>v[key]!)),max=Math.max(...valid.map(v=>v[key]!));if(max===min)continue;values.forEach((v,i)=>{totals[i].points+=(v[key]!-min)/(max-min);if(v[key]===max)totals[i].reasons.push(criteriaLabels[key]);});}
 totals.sort((a,b)=>b.points-a.points);
 const top=totals[0];const unique=!!top&&top.points>0&&top.points>(totals[1]?.points??0);
 return {totals,winner:unique?top.id:null,explanation:unique?`${list.find(s=>s.id===top.id)?.name} лучше соответствует выбранным предпочтениям: ${top.reasons.join(', ').toLowerCase()}. Это соответствие фильтрам, а не оценка клинической эффективности.`:'Данных или различий недостаточно для обоснованного выбора. Сравните условия и обсудите запрос со специалистами.',strengths:list.map(s=>({id:s.id,items:strengthsFor(reviews,s.id,s.is_demo)}))};
}
