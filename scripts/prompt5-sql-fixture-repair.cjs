const fs=require('node:fs');
for(const file of ['care.sql','payment-holds.sql']){const p='supabase/tests/'+file;let s=fs.readFileSync(p,'utf8');s=s.replace('insert into auth.users(id,email,email_confirmed_at) values(', 'insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values(').replace(/(@example\.invalid',now\(\))\);/,"$1,'{\"is_demo\":true}');");
 if(file==='care.sql'){
 const owner='f6100000-0000-4000-8000-000000000002',provider='f6130000-0000-4000-8000-000000000001';
 s=s.replaceAll('20000000-0000-4000-8000-000000000002',owner).replaceAll('00000000-0000-4000-8000-000000000001',provider);
 const fixture=`insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values('${owner}','care-provider@example.invalid',now(),'{"is_demo":true}');\ninsert into public.user_roles(user_id,role) values('${owner}','specialist') on conflict(user_id) do nothing;\ninsert into public.specialists(id,name,specialty,city,district,price,experience,online,concerns,ages,description,color,published,is_demo,verification_status,owner_id) values('${provider}','QA · демо','Логопед','Алматы','Бостандыкский',10000,5,false,array['speech'],array['2–3'],'Temporary QA fixture','lilac',true,true,'approved','${owner}');\ninsert into public.clinic_members(clinic_id,specialist_id,status) values('30000000-0000-4000-8000-000000000001','${provider}','active');\n`;
 s=s.replace('insert into public.schedule_slots(',fixture+'insert into public.schedule_slots(');
 }
 fs.writeFileSync(p,s);
}
