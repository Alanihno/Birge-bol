const fs=require('node:fs');
const centers=JSON.parse(fs.readFileSync('src/domain/contest-centers.json','utf8'));
const q=v=>"'"+String(v).replaceAll("'","''")+"'";
const id=v=>`md5(${q('bb-contest-'+v)})::uuid`;
const out=['-- Contest fixtures. Real directory contacts supplied by the user; all generated people/visits stay is_demo=true.'];
for(const c of centers){
 const cid=id('center-'+c.key),owner=id('owner-'+c.key);
 out.push(`insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values(${owner},'authenticated','authenticated',${q(c.key+'-owner@birge.example')},'{"is_demo":true,"provider":"email","providers":["email"]}','{}',now(),now()) on conflict(id) do nothing;`,
 `insert into public.user_roles(user_id,role) values(${owner},'clinic') on conflict do nothing;`,
 `insert into public.profiles(id) values(${owner}) on conflict do nothing;`,
 `insert into public.clinics(id,owner_id,name,district,address,description,services,contacts,status,is_demo) values(${cid},${owner},${q(c.name)},${q(c.district)},${q(c.city+', '+c.addresses[0])},${q(c.name+' — '+c.services.slice(0,3).join(', ')+'. Направление и план встреч обсуждаются с семьёй индивидуально.')},${q(c.services.join(' · '))},${q(JSON.stringify({city:c.city,whatsapp:c.phone,telegram:'',website:c.website,note:c.phone?'Телефон: '+c.phone:'Контакт уточняется'}))},'approved',true) on conflict(id) do nothing;`);
 c.addresses.forEach((address,i)=>out.push(`insert into public.clinic_branches(id,clinic_id,name,district,address) values(${id('branch-'+c.key+'-'+i)},${cid},${q(i?'Филиал '+(i+1):'Основной центр')},${q(c.district)},${q(c.city+', '+address)}) on conflict(id) do nothing;`));
 c.names.forEach((name,i)=>{
  const sid=id('provider-'+c.key+'-'+i),uid=id('professional-'+c.key+'-'+i),price=c.key==='asyl-miras'?0:12000+i*2000;
  out.push(`insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values(${uid},'authenticated','authenticated',${q(c.key+'-specialist-'+(i+1)+'@birge.example')},'{"is_demo":true,"provider":"email","providers":["email"]}','{}',now(),now()) on conflict(id) do nothing;`,
   `insert into public.user_roles(user_id,role) values(${uid},'specialist') on conflict do nothing;`,
   `insert into public.profiles(id) values(${uid}) on conflict do nothing;`,
   `insert into public.specialists(id,owner_id,name,specialty,city,district,price,experience,online,concerns,ages,description,address,color,published,is_demo,verification_status,profile) values(${sid},${uid},${q(name)},${q(c.specialties[i])},${q(c.city)},${q(c.district)},${price},${4+i*2},false,array['speech','communication','attention'],array['2–3','4–5','6–8'],${q('Помогает семье уточнить запрос, договориться о понятной цели и подготовиться к занятиям. Объясняет ход встречи и отвечает на вопросы родителей.')},${q(c.city+', '+c.addresses[i%c.addresses.length])},${q(['lilac','peach','sage'][i])},true,true,'approved',${q(JSON.stringify({education:'Профильное педагогическое образование',languages:['Русский','Қазақша'],cancellation:'Перенос и отмена — по договорённости, предупредите за 24 часа.',self_strengths:[],contacts:'Сообщения внутри Birge Bol',center:c.name}))}::jsonb) on conflict(id) do nothing;`,
   `insert into public.clinic_members(clinic_id,specialist_id,status) values(${cid},${sid},'active') on conflict do nothing;`,
   `insert into public.specialist_services(id,specialist_id,title,price,age_ranges,stages) values(${id('service-'+c.key+'-'+i)},${sid},'Индивидуальная консультация',${price},array['2–3','4–5','6–8'],array['first','visited','conclusion']) on conflict(id) do nothing;`,
   `insert into public.schedule_slots(id,specialist_id,starts_at,ends_at,service,price,available) select md5('bb-contest-slot-'||${sid}::text||'-'||d||'-'||h)::uuid,${sid},((current_date+d)+make_interval(hours=>h)) at time zone 'Asia/Almaty',((current_date+d)+make_interval(hours=>h,mins=>45)) at time zone 'Asia/Almaty','Индивидуальная консультация',${price},true from generate_series(1,7)d cross join unnest(array[9,11,14,16])h on conflict(id) do nothing;`);
 });
}
out.push(`do $$ declare p uuid:='20000000-0000-4000-8000-000000000001';family uuid;child uuid;sid uuid;aid uuid;rid uuid;visit_at timestamptz;goal int;n int;i int;j int;counter int:=0;sl public.schedule_slots;cid uuid;begin
 for i in 2..38 loop
  family:=md5('bb-prepared-family-'||i)::uuid;child:=md5('bb-prepared-child-'||i)::uuid;
  insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values(family,'authenticated','authenticated','fixture-family-'||i||'@birge.example','{"is_demo":true,"provider":"email","providers":["email"]}','{}',now(),now()) on conflict(id) do nothing;
  insert into public.user_roles(user_id,role) values(family,'parent') on conflict do nothing;
  insert into public.profiles(id) values(family) on conflict do nothing;
  insert into public.children(id,parent_id,label,age,city,district,concerns,experience,budget,format,case_group) values(child,family,'Профиль '||i||' · демо',case when i%5=0 then '4–5' else '2–3' end,'Алматы','Бостандыкский',array['speech','communication'],'visited',25000,'offline','speech') on conflict(id) do nothing;
 end loop;
 update public.children set case_group='speech' where id='10000000-0000-4000-8000-000000000001' and parent_id=p and case_group='unknown';
 for sid in select id from public.specialists where is_demo and published order by id loop
  goal:=20+(('x'||substr(md5(sid::text),1,6))::bit(24)::int%19);
  select count(*) into n from public.reviews where specialist_id=sid and status='verified' and visit_verified;
  if n>=goal then continue;end if;
  for i in n+1..goal loop
   family:=md5('bb-prepared-family-'||greatest(2,i))::uuid;child:=md5('bb-prepared-child-'||greatest(2,i))::uuid;
   aid:=md5('bb-contest-visit-'||sid||'-'||i)::uuid;rid:=md5('bb-contest-review-'||sid||'-'||i)::uuid;
   visit_at:=date_trunc('day',now())-make_interval(days=>i*3+(('x'||substr(md5(sid::text),1,2))::bit(8)::int%10))+interval '9 hours';
   insert into public.appointments(id,parent_id,child_id,specialist_id,starts_at,ends_at,status,service,reason,contact,share_diary,visit_verified,is_demo,visited_at,visit_format) values(aid,family,child,sid,visit_at,visit_at+interval '45 minutes','completed','Индивидуальная консультация','Обсудить речь, общение и вопросы семьи','Переписка в приложении',false,true,true,visit_at,'offline') on conflict(id) do nothing;
   insert into private.visit_confirmations(appointment_id,parent_id,specialist_id,confirmed_at,method) values(aid,family,sid,visit_at,'demo_fixture') on conflict do nothing;
   insert into public.reviews(id,parent_id,specialist_id,appointment_id,body,contact,status,evidence,is_demo,visit_verified,strengths,created_at) values(rid,family,sid,aid,(array['До встречи уточнили наш запрос и объяснили, как будет проходить знакомство. На вопросы о речи и общении ответили понятными словами.','Понравилось, что сначала выслушали наблюдения семьи, а затем обсудили цель и следующий шаг. Не пришлось разбираться в сложных терминах.','Пришли с вопросами о речи ребёнка. Специалист дал время освоиться и рассказал, что можно обсудить на следующей встрече.','Удобно заранее согласовать время и написать вопрос в приложении. После встречи остался понятный список вопросов и договорённостей.','Внимательно отнеслись к тому, как ребёнку удобнее общаться. Обсудили наши наблюдения, не сравнивая его с другими детьми.','Объяснили назначение заданий и как отмечать то, что получилось. Можно уточнить непонятное в переписке.','Встреча началась вовремя. Условия переноса и стоимость были известны заранее. На организационные вопросы ответили подробно.','Контакт был спокойным, родителю дали возможность задать вопросы. Хотелось бы чуть больше времени на обсуждение домашних наблюдений.','Обсудили понятную цель на месяц и способ вести короткие заметки. Удобно видеть назначения и расписание в одном месте.','Помогли сформулировать запрос семьи. Понравились внимательность и обратная связь после знакомства.'])[1+i%10],case when i%9=0 then 3 when i%4=0 then 4 else 5 end,'verified','contest-fixture-v20261114',true,true,array['Понятные объяснения родителям','Хорошая обратная связь',case when i%2=0 then 'Терпеливое отношение' else 'Индивидуальный подход' end],visit_at+interval '1 hour') on conflict(id) do nothing;
   insert into private.review_case_features(review_id,age,case_group,visit_format,consented_at) values(rid,case when i%5=0 then 4.5 else 2.5 end,'speech','offline',visit_at+interval '1 hour') on conflict do nothing;
  end loop;
 end loop;
 for sid in select id from public.specialists where is_demo and owner_id in(select id from auth.users where email like '%-specialist-%@birge.example') order by id loop
  counter:=counter+1;select clinic_id into cid from public.clinic_members where specialist_id=sid and status='active' limit 1;
  for j in 1..3 loop
   aid:=md5('bb-contest-upcoming-'||sid||'-'||j)::uuid;if exists(select 1 from appointments where id=aid) then continue;end if;
   family:=case when j=1 then p else md5('bb-prepared-family-'||(counter%35+2))::uuid end;
   child:=case when j=1 then ('10000000-0000-4000-8000-'||lpad((counter%3+1)::text,12,'0'))::uuid else md5('bb-prepared-child-'||(counter%35+2))::uuid end;
   select s.* into sl from public.schedule_slots s where s.specialist_id=sid and s.available and s.starts_at>now()+interval '12 hours' and not exists(select 1 from public.appointments a where a.status in('pending','confirmed','rescheduled','attended') and (a.specialist_id=sid or a.child_id=child) and a.starts_at<s.ends_at and coalesce(a.ends_at,a.starts_at+interval '45 minutes')>s.starts_at) order by case when (s.starts_at at time zone 'Asia/Almaty')::date>=current_date+1+(counter%5) then 0 else 1 end,s.starts_at limit 1 for update skip locked;
   if found then
    insert into public.appointments(id,parent_id,child_id,specialist_id,slot_id,starts_at,ends_at,status,service,reason,contact,share_diary,visit_verified,is_demo,clinic_id) values(aid,family,child,sid,sl.id,sl.starts_at,sl.ends_at,'confirmed',sl.service,'Обсудить речь и общение, цели и план встреч','Сообщения внутри приложения',j=1,false,true,cid);
    update public.schedule_slots set available=false where id=sl.id;
    insert into private.booking_payments(appointment_id,parent_id,specialist_id,state,amount,deadline,confirmed_at) values(aid,family,sid,'confirmed',sl.price,now(),now()) on conflict do nothing;
   end if;
  end loop;
 end loop;
end $$;`);
out.push(`update public.reviews set body=case when contact>=5 then 'На встрече внимательно выслушали наш запрос о речи и общении, объяснили порядок занятий и ответили на вопросы семьи. Удобно согласовывать следующие шаги.' else 'Обсудили вопросы семьи и организацию встреч. Хотелось бы больше времени на объяснение домашних наблюдений, но основные договорённости понятны.' end where evidence='demo-fixture-v20261114';`);
const sql='alter table public.reviews disable trigger refresh_contact_rating;\n'+out.join('\n')+'\nalter table public.reviews enable trigger refresh_contact_rating;\nupdate public.specialists s set verified_count=v.review_count,contact_rating=v.overall from private.rating_values(null,null,\'any\')v where s.id=v.specialist_id;\n';
fs.writeFileSync('supabase/contest-center-fixtures.sql',sql);
console.log('Prepared 5 centers, 15 specialists, weekly slots, linked visits and review targets 20–38');
