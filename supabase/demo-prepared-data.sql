-- Synthetic fixtures only. Fixed keys make reruns safe; existing bookings are preserved.
-- Run in a transaction as the database owner, never through a browser client.
do $$
declare
 p uuid := '20000000-0000-4000-8000-000000000001';
 child uuid; family uuid; sid uuid; aid uuid; rid uuid; gid uuid; tid uuid; sl public.schedule_slots;
 n int := 0; j int; k int; visit_at timestamptz; clinic uuid;
begin
 if not exists(select 1 from auth.users where id=p and email='parent@birge.example' and raw_app_meta_data->>'is_demo'='true') then
   raise exception 'Expected synthetic demo parent account';
 end if;
 for j in 2..4 loop
   family := md5('bb-prepared-family-'||j)::uuid;
   insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
     values(family,'authenticated','authenticated','fixture-family-'||j||'@birge.example',now(),'{"provider":"email","providers":["email"],"is_demo":true}', '{"is_demo":true}',now(),now()) on conflict(id) do nothing;
   insert into public.user_roles(user_id,role) values(family,'parent') on conflict do nothing;
   insert into public.profiles(id) values(family) on conflict do nothing;
   insert into public.children(id,parent_id,label,age,city,district,concerns,experience,budget,format,case_group)
     values(md5('bb-prepared-child-'||j)::uuid,family,'Семья '||j||' · демо',case j when 2 then '4–5' when 3 then '6–8' else '2–3' end,'Алматы','Алмалинский',array['speech'],'visited',20000,case when j=4 then 'online' else 'offline' end,case when j=3 then 'autism' else 'speech' end) on conflict(id) do nothing;
 end loop;
 for sid in select id from public.specialists where is_demo and published order by id loop
   n:=n+1;
   for j in 1..4 loop
     family:=case when j=1 then p else md5('bb-prepared-family-'||j)::uuid end;
     child:=case when j=1 then '10000000-0000-4000-8000-000000000001'::uuid else md5('bb-prepared-child-'||j)::uuid end;
     aid:=md5('bb-prepared-visit-'||sid||'-'||j)::uuid;
     rid:=md5('bb-prepared-review-'||sid||'-'||j)::uuid;
     visit_at:=date_trunc('day',now())-make_interval(days=>case when n=1 then 2+j else 7+n+j*7 end)+interval '9 hours';
     insert into public.appointments(id,parent_id,child_id,specialist_id,starts_at,ends_at,status,service,reason,contact,share_diary,visit_verified,is_demo,visited_at,visit_format)
       values(aid,family,child,sid,visit_at,visit_at+interval '45 minutes','completed','Учебный приём · демо','Вымышленный визит для демонстрации рейтинга','Демо · без реальных контактов',j=1 and n=1,true,true,visit_at,case when j=4 then 'online' else 'offline' end) on conflict(id) do nothing;
     insert into private.visit_confirmations(appointment_id,parent_id,specialist_id,confirmed_at,method)
       values(aid,family,sid,visit_at,'demo_fixture') on conflict do nothing;
     insert into public.reviews(id,parent_id,specialist_id,appointment_id,body,contact,status,evidence,is_demo,visit_verified,strengths,created_at)
       values(rid,family,sid,aid,
         case j when 1 then 'Демонстрационный отзыв: на учебной встрече специалист объяснил порядок занятия и ответил на вопросы семьи. Этот пример не описывает настоящего ребёнка и не подтверждает результат помощи.'
         when 2 then 'Демонстрационный отзыв: в примере семье было удобно заранее уточнить вопросы и обсудить следующий шаг. Это вымышленный сценарий для проверки карточки специалиста.'
         when 3 then 'Демонстрационный отзыв: в учебном сценарии удалось обсудить организацию встречи; хотелось бы получить больше времени для вопросов. Оценка приведена только для демонстрации формулы.'
         else 'Демонстрационный отзыв: пример показывает обратную связь после посещения, комментарий семьи и отметку проверенного визита. Реальная консультация в этом примере не проводилась.' end,
         case when (n+j)%7=0 then 3 when (n+j)%3=0 then 4 else 5 end,'verified','demo-fixture-v20261114',true,true,
         array['Понятные объяснения родителям','Хорошая обратная связь'],visit_at+interval '1 hour') on conflict(id) do nothing;
     insert into private.review_case_features(review_id,age,case_group,visit_format,consented_at)
       values(rid,case j when 2 then 4.5 when 3 then 7 else 2.5 end,case when j=3 then 'autism' else 'speech' end,case when j=4 then 'online' else 'offline' end,visit_at+interval '1 hour') on conflict do nothing;
   end loop;
 end loop;
 -- Three children in the existing public demo family: upcoming confirmed visits and reports.
 sid:='00000000-0000-4000-8000-000000000001';
 select clinic_id into clinic from public.clinic_members where specialist_id=sid and status='active' limit 1;
 for j in 1..3 loop
   child:=('10000000-0000-4000-8000-'||lpad(j::text,12,'0'))::uuid;
   if not exists(select 1 from public.children where id=child and parent_id=p and label like '%демо%') then continue; end if;
   aid:=md5('bb-prepared-upcoming-'||j)::uuid;
   if not exists(select 1 from public.appointments where id=aid) then
     select s.* into sl from public.schedule_slots s
       where s.specialist_id=sid and s.available and s.starts_at>now()+interval '12 hours'
         and (s.starts_at at time zone 'Asia/Almaty')::date=(now() at time zone 'Asia/Almaty')::date+j
         and not exists(select 1 from public.appointments a where a.status in ('pending','confirmed','rescheduled','attended') and (a.specialist_id=sid or a.child_id=child) and a.starts_at<s.ends_at and coalesce(a.ends_at,a.starts_at+interval '45 minutes')>s.starts_at)
       order by s.starts_at limit 1 for update skip locked;
     if found then
       insert into public.appointments(id,parent_id,child_id,specialist_id,slot_id,starts_at,ends_at,status,service,reason,contact,share_diary,visit_verified,is_demo,clinic_id)
         values(aid,p,child,sid,sl.id,sl.starts_at,sl.ends_at,'confirmed',sl.service,'Демо · подтверждённая учебная запись, реальный приём не бронируется','Демо · сообщения внутри приложения',true,false,true,clinic);
       update public.schedule_slots set available=false where id=sl.id;
       insert into private.booking_payments(appointment_id,parent_id,specialist_id,state,amount,deadline,confirmed_at)
         values(aid,p,sid,'confirmed',sl.price,now(),now()) on conflict do nothing;
     end if;
   end if;
   gid:=md5('bb-prepared-goal-'||j)::uuid;
   insert into public.child_goals(id,parent_id,child_id,specialist_id,title,metric,target,due_at,status,stage,created_at)
     values(gid,p,child,sid,'Демо · подготовить и обсудить вопросы семьи','Обсуждённые вопросы',4,current_date+21,'active',2,now()-interval '7 days') on conflict(id) do nothing;
   for k in 1..3 loop
     insert into public.progress_entries(id,parent_id,goal_id,value,note,created_at)
       values(md5('bb-prepared-progress-'||j||'-'||k)::uuid,p,gid,k,
         case k when 1 then 'Демо-наблюдение: семья записала первый вопрос к встрече.' when 2 then 'Демо-наблюдение: уточнили расписание и условия переноса.' else 'Демо-отчёт: подготовлены три вопроса; на следующей встрече обсудить домашнее задание. Это пример организации, а не оценка развития.' end,
         now()-make_interval(days=>7-k*2)) on conflict(id) do nothing;
   end loop;
   for k in 1..2 loop
     tid:=md5('bb-prepared-task-'||j||'-'||k)::uuid;
     insert into public.task_assignments(id,parent_id,child_id,specialist_id,material_id,goal_id,goal_title,duration,frequency,due_at,comment,status,created_at)
       values(tid,p,child,sid,('40000000-0000-4000-8000-'||lpad(k::text,12,'0'))::uuid,gid,'Демо · подготовить и обсудить вопросы семьи',5,'По согласованию со специалистом',current_date+7,'Демонстрационное назначение: знакомство с интерфейсом, без лечебных упражнений.',case when k=1 then 'active' else 'done' end,now()-interval '6 days') on conflict(id) do nothing;
     insert into public.task_completions(id,assignment_id,parent_id,child_id,specialist_id,outcome,comment,created_at)
       values(md5('bb-prepared-completion-'||j||'-'||k)::uuid,tid,p,child,sid,case when k=1 then 'partial' else 'good' end,
         case when k=1 then 'Демо: памятку прочитали частично, оставили вопрос специалисту.' else 'Демо: записали вопросы к следующей встрече. Учебный пример отчёта.' end,now()-make_interval(days=>3-k)) on conflict do nothing;
   end loop;
 end loop;
end $$;
