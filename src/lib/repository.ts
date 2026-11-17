import { demoSpecialists, demoQuestions, initialDemo, emptyPersonal } from '../domain/data';
import type { Repository, PersonalData, Child, Goal, Question, Review, Appointment } from '../domain/types';
import { mode, supabase } from './backend';
const STORAGE='bb-synthetic-v1';
let scope='';
const storageKey=()=>!scope||scope==='demo-parent'||scope==='20000000-0000-4000-8000-000000000001'?STORAGE:STORAGE+':'+scope;
function read():PersonalData{try{const raw=localStorage.getItem(storageKey());if(raw){const data=JSON.parse(raw);if(Array.isArray(data.children)&&Array.isArray(data.goals)&&Array.isArray(data.favorites))return {...emptyPersonal(),...data};}}catch{/* invalid or unavailable local storage */}return !scope||scope==='demo-parent'||scope==='20000000-0000-4000-8000-000000000001'?initialDemo():emptyPersonal();}
function write(fn:(data:PersonalData)=>void){const data=read();fn(data);localStorage.setItem(storageKey(),JSON.stringify(data));}
export const demoAdapter:Repository={
 async catalog(){try{const care=JSON.parse(localStorage.getItem('bb-care-v3')||'null');const stored=JSON.parse(localStorage.getItem('bb-demo-catalog')||'null');return (care?.specialists||stored||demoSpecialists).filter((s:{published:boolean})=>s.published);}catch{return demoSpecialists;}},async questions(){return demoQuestions;},async personal(userId){scope=userId;return read();},
 async saveChild(userId,child){scope=userId;write(d=>{d.children=[...d.children.filter(c=>c.id!==child.id),child];});},
 async favorite(userId,id,save){scope=userId;write(d=>{d.favorites=save?[...new Set([...d.favorites,id])]:d.favorites.filter(x=>x!==id);});},
 async ask(userId,question){scope=userId;write(d=>{d.questions.unshift(question);d.notifications.unshift({id:crypto.randomUUID(),title:'Учебный вопрос сохранён. Ответ можно открыть в карточке вопроса.',read:false,to:`/moms/questions/${question.id}`});});},
 async removeQuestion(userId,id){scope=userId;write(d=>{d.questions=d.questions.filter(x=>x.id!==id);});},
 async saveGoal(userId,goal){scope=userId;write(d=>{d.goals=[...d.goals.filter(x=>x.id!==goal.id),goal];});},
 async addEntry(userId,goalId,entry){scope=userId;write(d=>{const g=d.goals.find(x=>x.id===goalId);if(g)g.entries.push(entry);});},
 async feedback(userId,specialistId,childId,answers,review){scope=userId;write(d=>{d.feedbacks=[...(d.feedbacks||[]),{id:crypto.randomUUID(),child_id:childId,specialist_id:specialistId,answers}];if(review)d.reviews.unshift({...review,specialist_id:specialistId});d.notifications.unshift({id:crypto.randomUUID(),title:review?'Учебный чек-лист сохранён. Отзыв ожидает демомодерации.':'Учебный чек-лист сохранён без публикации отзыва.',read:false,to:'/profile'});});},
 async appointment(userId,item){scope=userId;write(d=>{d.appointments.push(item);});},async deleteChild(userId,id){scope=userId;write(d=>{d.children=d.children.filter(c=>c.id!==id);d.goals=d.goals.filter(g=>g.child_id!==id);d.appointments=d.appointments.filter(a=>a.child_id!==id);});},
 async removeReview(userId,id){scope=userId;write(d=>{d.reviews=d.reviews.filter(r=>r.id!==id);});},async markRead(userId){scope=userId;write(d=>{d.notifications.forEach(n=>{n.read=true;});});}
};
function client(){if(!supabase)throw new Error('Supabase не настроен');return supabase;}
function checked<T extends {error:unknown}>(result:T):T{if(result.error)throw new Error('Не удалось выполнить запрос. Проверьте соединение и повторите.');return result;}
export const supabaseAdapter:Repository={
 async catalog(){const r=checked(await client().from('specialists').select('*').eq('published',true).order('name').limit(200));return r.data||[];},
 async questions(){const r=checked(await client().from('questions').select('*,answers(*),community_replies(count)').in('status',['open','answered']).order('created_at',{ascending:false}).limit(200));return (r.data||[]).map(q=>({...q,reply_count:q.community_replies?.[0]?.count||0}));},
 async personal(userId){const c=client();const results=await Promise.all([c.from('children').select('*').eq('parent_id',userId),c.from('favorites').select('specialist_id').eq('parent_id',userId),c.from('questions').select('*,answers(*)').eq('parent_id',userId),c.from('child_goals').select('*,progress_entries(*)').eq('parent_id',userId),c.from('reviews').select('*').eq('parent_id',userId),c.from('appointments').select('*').eq('parent_id',userId),c.from('notifications').select('*').eq('parent_id',userId),c.from('profiles').select('contact').eq('id',userId).maybeSingle()]);results.forEach(checked);return {children:results[0].data as Child[]||[],favorites:(results[1].data||[]).map(x=>x.specialist_id),questions:results[2].data as Question[]||[],goals:(results[3].data||[]).map(g=>({...g,entries:g.progress_entries})) as Goal[],reviews:results[4].data as Review[]||[],appointments:results[5].data as Appointment[]||[],notifications:results[6].data||[],contact:results[7].data?.contact||''};},
 async saveChild(_userId,child){checked(await client().rpc('save_synthetic_child',{p_child:{...child,label:/демо/i.test(child.label)?child.label:child.label+' · демо'}}));},
 async favorite(userId,id,save){checked(save?await client().from('favorites').upsert({parent_id:userId,specialist_id:id}):await client().from('favorites').delete().eq('parent_id',userId).eq('specialist_id',id));},
 async ask(userId,q){checked(await client().from('questions').insert({id:q.id,parent_id:userId,title:q.title,body:q.body,topic:q.topic,city:q.city,status:'pending_moderation',is_demo:false}));},
 async removeQuestion(userId,id){checked(await client().from('questions').delete().eq('parent_id',userId).eq('id',id));},
 async saveGoal(userId,g){const {entries:_,...fields}=g;void _;checked(await client().from('child_goals').upsert({...fields,parent_id:userId}));},
 async addEntry(userId,id,e){checked(await client().from('progress_entries').insert({...e,goal_id:id,parent_id:userId}));},
 async feedback(_userId,id,childId,answers,review){checked(await client().rpc('submit_feedback',{p_child_id:childId,p_specialist_id:id,p_answers:answers,p_review:review?.body||null}));},
 async appointment(userId,item){checked(await client().from('appointments').insert({...item,parent_id:userId}));},
 async deleteChild(userId,id){checked(await client().from('children').delete().eq('id',id).eq('parent_id',userId));},
 async removeReview(userId,id){checked(await client().from('reviews').delete().eq('id',id).eq('parent_id',userId));},
 async markRead(userId){checked(await client().from('notifications').update({read:true}).eq('parent_id',userId));}
};
export const repository=mode==='demo'?demoAdapter:supabaseAdapter;
export function resetDemo(){for(const k of Object.keys(localStorage))if(k.startsWith('bb-care')||k.startsWith('bb-synthetic')||k==='bb-demo-identity')localStorage.removeItem(k);localStorage.removeItem('bb-journey-v2');localStorage.removeItem(STORAGE);localStorage.removeItem('bb-demo-catalog');localStorage.removeItem('bb-demo-session');sessionStorage.removeItem('bb-demo-identity');sessionStorage.removeItem('bb-active-child');sessionStorage.removeItem('bb-onboarding');location.assign('/');}
