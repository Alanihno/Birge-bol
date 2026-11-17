import fs from 'node:fs';
import { demoSpecialists, demoQuestions, terms, districts, specialties } from '../src/domain/data.ts';
const literal=v=>v===null?'null':typeof v==='boolean'||typeof v==='number'?String(v):Array.isArray(v)?`array[${v.map(literal).join(',')}]::text[]`:`'${String(v).replaceAll("'","''")}'`;
const insert=(table,obj)=>`insert into public.${table}(${Object.keys(obj).join(',')}) values(${Object.values(obj).map(literal).join(',')}) on conflict do nothing;`;
const lines=['-- Synthetic public fixtures only. No child profiles or real user accounts.'];
lines.push("insert into public.cities(name) values('Алматы') on conflict(name) do nothing;");
for(const d of districts)lines.push(`insert into public.districts(city_id,name) select id,${literal(d)} from public.cities where name='Алматы' on conflict do nothing;`);
for(const s of specialties)lines.push(insert('specializations',{name:s}));
for(const s of demoSpecialists)lines.push(insert('specialists',s));
for(const t of terms)lines.push(insert('medical_terms',{...t,approved:false,is_demo:true}));
for(const [i,q]of demoQuestions.entries()){const id=`30000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`;const {answers,id:_,...fields}=q;void _;lines.push(insert('questions',{...fields,id}));for(const [j,a]of answers.entries())lines.push(insert('answers',{id:`40000000-0000-4000-8000-${String(i*10+j+1).padStart(12,'0')}`,question_id:id,body:a.body,is_demo:true,approved:true}));}
lines.push(insert('recommendation_rules',{version:'2026.11.demo.1',title:'Пример ориентира при запросе по речи',conditions:JSON.stringify({concerns:['speech']}),explanation:'Обсудить развитие речи с логопедом и задать вопрос о проверке слуха. Не является назначением.',approved:false,enabled:false}));
fs.writeFileSync('supabase/seed.sql',lines.join('\n')+'\n');console.log('Synthetic seed generated.');
