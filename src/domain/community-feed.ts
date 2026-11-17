import type { Child, Question } from './types';
export const communityTopics=['Волонтёры','Новости','Мероприятия','Поведение','Обучение','Сон и быт','Семья','Речь','Занятия','ПМПК','Поддержка'];
const topicsByConcern:Record<string,string[]>={speech:['Речь','Занятия'],communication:['Поведение','Семья','Поддержка'],behavior:['Поведение','Сон и быт'],learning:['Обучение','ПМПК'],attention:['Обучение','Сон и быт'],writing:['Обучение'],other:['Поддержка']};
export function recommendThreads(questions:Question[],child:Child,followed:string[],now=Date.now()){
 const relevant=new Set(child.concerns.flatMap(c=>topicsByConcern[c]||[]));
 const score=(q:Question)=>(followed.includes(q.topic)?60:0)+(relevant.has(q.topic)?25:0)+Math.max(0,14-(now-Date.parse(q.created_at))/86400000);
 return [...questions].sort((a,b)=>score(b)-score(a)||b.created_at.localeCompare(a.created_at)||a.id.localeCompare(b.id));
}
