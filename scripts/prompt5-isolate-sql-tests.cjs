const fs=require('node:fs');
const originalParent='20000000-0000-4000-8000-000000000001',originalChild='10000000-0000-4000-8000-000000000001';
for(const [file,parent,child]of [['care.sql','f6100000-0000-4000-8000-000000000001','f6110000-0000-4000-8000-000000000001'],['payment-holds.sql','f6200000-0000-4000-8000-000000000001','f6210000-0000-4000-8000-000000000001']]){
 const path='supabase/tests/'+file;let s=fs.readFileSync(path,'utf8');s=s.replaceAll(originalParent,parent).replaceAll(originalChild,child);
 const fixture=`\n-- Isolated synthetic family; all fixture changes roll back. Existing demo families are untouched.\ninsert into auth.users(id,email,email_confirmed_at) values('${parent}','${file.replace('.sql','')}@example.invalid',now());\ninsert into public.user_roles(user_id,role) values('${parent}','parent') on conflict(user_id) do nothing;\ninsert into public.children(id,parent_id,label,age,city,district,experience,budget,format,concerns) values('${child}','${parent}','QA · демо','2–3','Алматы','Бостандыкский','first',20000,'any',array['speech']);\n`;
 s=s.replace('begin;','begin;'+fixture);
 if(file==='care.sql'){
  const slot='f6120000-0000-4000-8000-000000000001';s=s.replace('create temp table care_test_context',`insert into public.schedule_slots(id,specialist_id,starts_at,ends_at,service,price,available) values('${slot}','00000000-0000-4000-8000-000000000001',now()+interval '5 minutes',now()+interval '50 minutes','QA · демо',10000,true);\ncreate temp table care_test_context`);
  s=s.replace(/insert into care_test_context values\('slot',\(select[^\n]+\);/,`insert into care_test_context values('slot','${slot}');`);
  s=s.replace("if jsonb_array_length(public.care_snapshot()->'patients')<>0 then",`if exists(select 1 from jsonb_array_elements(public.care_snapshot()->'patients') c where c->>'id'='${child}') then`);
  s=s.replace("if jsonb_array_length(public.care_snapshot()->'patients')<>1 then",`if not exists(select 1 from jsonb_array_elements(public.care_snapshot()->'patients') c where c->>'id'='${child}') then`);
  s=s.replace("(select (public.care_snapshot()->'assignments'->0->>'id'))",`(select a->>'id' from jsonb_array_elements(public.care_snapshot()->'assignments') a where a->>'child_id'='${child}' limit 1)`);
  s=s.replace("if jsonb_array_length(result->'appointments')<>1 then", "if not exists(select 1 from jsonb_array_elements(result->'appointments') a where a->>'id'=(select v from care_test_context where k='appointment')) then");
  s=s.replace("if jsonb_array_length(public.care_snapshot()->'patients')<>0 or jsonb_array_length(public.care_snapshot()->'assignments')<>0 then",`if exists(select 1 from jsonb_array_elements(public.care_snapshot()->'patients') c where c->>'id'='${child}') or exists(select 1 from jsonb_array_elements(public.care_snapshot()->'assignments') a where a->>'child_id'='${child}') then`);
  s=s.replace(/delete from auth.users where id='20000000-0000-4000-8000-00000000000[23]';/g,'-- Existing synthetic staff identities are not deleted.');
 }
 fs.writeFileSync(path,s);
}
console.log('SQL suites now use isolated transactional families, without clearing shared demo records.');
