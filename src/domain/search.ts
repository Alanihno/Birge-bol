import type { Specialist } from './types';
import { normalize } from './logic';
import { districtNames } from './care';
export type Suggestion={id:string;label:string;kind:'specialty'|'district'|'person'|'concern';value:string;aliases:string[]};
const dictionary:Suggestion[]=[
 ...['Логопед','Логопед-дефектолог','Дефектолог','Психолог','Эрготерапевт','Нейропсихолог','Специальный педагог','Сурдолог'].map(label=>({id:'s-'+label,label,kind:'specialty' as const,value:label,aliases:label==='Логопед'?['логопет','логопедд','развитие речи']:label==='Психолог'?['детский психолог','психологг']:[]})),
 ...districtNames.map(label=>({id:'d-'+label,label:label+' район',kind:'district' as const,value:label,aliases:[]})),
 {id:'c-speech',label:'Речь и развитие коммуникации',kind:'concern',value:'speech',aliases:['ребенок не говорит','не разговаривает','зрр','развитие речи','логопет']},
 {id:'c-communication',label:'Общение и коммуникация',kind:'concern',value:'communication',aliases:['специалисты по коммуникации','общение']},
];
export function suggestions(query:string,catalog:Specialist[]):Suggestion[]{const q=normalize(query);if(q.length<2||q.length>100)return [];return [...dictionary,...catalog.map(s=>({id:s.id,label:s.name,kind:'person' as const,value:s.id,aliases:[s.specialty]}))].filter(s=>[s.label,...s.aliases].some(word=>normalize(word).includes(q))).slice(0,7);}
export function matchesSearch(s:Specialist,query:string){const q=normalize(query);if(!q)return true;if(normalize(`${s.name} ${s.specialty} ${s.description} ${s.district}`).includes(q))return true;const options=suggestions(q,[]);return options.some(o=>o.kind==='specialty'?s.specialty===o.value:o.kind==='district'?s.district===o.value:o.kind==='concern'?s.concerns.includes(o.value as Specialist['concerns'][number]):false);}
