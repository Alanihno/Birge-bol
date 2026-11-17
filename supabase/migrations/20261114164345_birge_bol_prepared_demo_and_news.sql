alter table public.questions drop constraint questions_topic_check;
alter table public.questions add constraint questions_topic_check check(topic in ('Новости','Речь','Занятия','ПМПК','Поддержка'));
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
-- Synthetic product news and moderated example discussions. Idempotent.
insert into public.questions(id,title,body,topic,city,status,is_demo,created_at) values(md5('bb-prepared-thread-0')::uuid,'Новости: оплата и статус бронирования','После записи откройте «Дневник → Приёмы». В блоке «Оплата записей» видны срок оплаты и отправленные чеки. Перевод выполняется вне приложения; затем приложите чек и нажмите «Я оплатила». Только специалист подтверждает получение денег.','Новости','Алматы','answered',true,now()-make_interval(mins=>0)) on conflict(id) do nothing;
insert into public.answers(id,question_id,body,approved,is_demo) values(md5('bb-prepared-thread-0-reply-0')::uuid,md5('bb-prepared-thread-0')::uuid,'Демо-пример: после отправки чека бронь сохраняется до проверки специалистом. Повторно оплачивать из-за ожидания подтверждения не нужно.',true,true) on conflict(id) do nothing;
insert into public.answers(id,question_id,body,approved,is_demo) values(md5('bb-prepared-thread-0-reply-1')::uuid,md5('bb-prepared-thread-0')::uuid,'Если срок неоплаченной брони истёк, проверьте свободное время в расписании и создайте новую запись.',true,true) on conflict(id) do nothing;
insert into public.questions(id,title,body,topic,city,status,is_demo,created_at) values(md5('bb-prepared-thread-1')::uuid,'Новости: постоянный QR для посещения','В кабинете специалиста есть постоянный QR-код для печати. В кабинете родителя откройте «Сканировать QR». Сервер проверит вашу подтверждённую запись и время: от 30 минут до начала до двух часов после окончания. После посещения открывается отзыв.','Новости','Алматы','answered',true,now()-make_interval(mins=>1)) on conflict(id) do nothing;
insert into public.answers(id,question_id,body,approved,is_demo) values(md5('bb-prepared-thread-1-reply-0')::uuid,md5('bb-prepared-thread-1')::uuid,'Печатный код не нужно обновлять перед каждым занятием. Специалист может заменить его при необходимости.',true,true) on conflict(id) do nothing;
insert into public.answers(id,question_id,body,approved,is_demo) values(md5('bb-prepared-thread-1-reply-1')::uuid,md5('bb-prepared-thread-1')::uuid,'QR можно сфотографировать, поэтому постоянный код сам по себе не доказывает физическое присутствие. Повторное подтверждение одной записи запрещено.',true,true) on conflict(id) do nothing;
insert into public.questions(id,title,body,topic,city,status,is_demo,created_at) values(md5('bb-prepared-thread-2')::uuid,'Новости: календарь, который можно взять с собой','В дневнике и кабинете специалиста доступна кнопка Google Календарь. Она создаёт личную ссылку на календарь для подписки. Ссылку добавляют в Google Календаре через «Добавить по URL». Подписка передаёт расписание в одну сторону.','Новости','Алматы','answered',true,now()-make_interval(mins=>2)) on conflict(id) do nothing;
insert into public.answers(id,question_id,body,approved,is_demo) values(md5('bb-prepared-thread-2-reply-0')::uuid,md5('bb-prepared-thread-2')::uuid,'Google обновляет подписку по своему расписанию. Актуальный статус и оплату проверяйте в Birge Bol.',true,true) on conflict(id) do nothing;
insert into public.answers(id,question_id,body,approved,is_demo) values(md5('bb-prepared-thread-2-reply-1')::uuid,md5('bb-prepared-thread-2')::uuid,'Ссылка открывает расписание её владельца. Не пересылайте её посторонним; при необходимости отзовите и создайте новую.',true,true) on conflict(id) do nothing;
insert into public.questions(id,title,body,topic,city,status,is_demo,created_at) values(md5('bb-prepared-thread-3')::uuid,'Новости: что означает рейтинг по похожим случаям','Общий рейтинг учитывает количество оценок, их свежесть и среднюю оценку платформы. Рейтинг по похожим случаям дополнительно учитывает возраст, согласованную категорию запроса и формат приёма. Если похожих отзывов нет, показывается общий рейтинг специалиста.','Новости','Алматы','answered',true,now()-make_interval(mins=>3)) on conflict(id) do nothing;
insert into public.answers(id,question_id,body,approved,is_demo) values(md5('bb-prepared-thread-3-reply-0')::uuid,md5('bb-prepared-thread-3')::uuid,'В демокаталоге все учебные отзывы подписаны как демонстрационные. Они показывают работу формулы и не являются отзывами настоящих семей.',true,true) on conflict(id) do nothing;
insert into public.answers(id,question_id,body,approved,is_demo) values(md5('bb-prepared-thread-3-reply-1')::uuid,md5('bb-prepared-thread-3')::uuid,'Оценка отражает впечатление семьи о взаимодействии; она не доказывает результат лечения и не гарантирует такой же опыт другому ребёнку.',true,true) on conflict(id) do nothing;
insert into public.questions(id,title,body,topic,city,status,is_demo,created_at) values(md5('bb-prepared-thread-4')::uuid,'Как подготовить вопросы к первому знакомству?','Учебная ситуация: идём на первую встречу и боимся забыть важные вопросы. Что уточнить о знакомстве, участии родителя, длительности встречи и обратной связи, чтобы спокойнее ориентироваться?','Речь','Алматы','answered',true,now()-make_interval(mins=>4)) on conflict(id) do nothing;
insert into public.answers(id,question_id,body,approved,is_demo) values(md5('bb-prepared-thread-4-reply-0')::uuid,md5('bb-prepared-thread-4')::uuid,'Демо-ответ: запишите две-три ситуации, которые хотите обсудить, и спросите, как будет устроена первая встреча. Примеры помогут объяснить запрос своими словами.',true,true) on conflict(id) do nothing;
insert into public.answers(id,question_id,body,approved,is_demo) values(md5('bb-prepared-thread-4-reply-1')::uuid,md5('bb-prepared-thread-4')::uuid,'Демо-ответ: отдельно уточните стоимость, точный адрес, длительность и правила переноса. Список нужных документов лучше запросить у самого центра.',true,true) on conflict(id) do nothing;
insert into public.questions(id,title,body,topic,city,status,is_demo,created_at) values(md5('bb-prepared-thread-5')::uuid,'Как записывать наблюдения без сравнения с другими?','Учебная ситуация: хочется вести заметки дома, но не превращать их в проверку ребёнка. Как договориться со специалистом о понятном способе наблюдения и не делать выводов по одному дню?','Речь','Алматы','answered',true,now()-make_interval(mins=>5)) on conflict(id) do nothing;
insert into public.answers(id,question_id,body,approved,is_demo) values(md5('bb-prepared-thread-5-reply-0')::uuid,md5('bb-prepared-thread-5')::uuid,'Демо-ответ: попросите специалиста выбрать один наблюдаемый показатель и объяснить, как его отмечать. Записывайте контекст, а не только количество.',true,true) on conflict(id) do nothing;
insert into public.answers(id,question_id,body,approved,is_demo) values(md5('bb-prepared-thread-5-reply-1')::uuid,md5('bb-prepared-thread-5')::uuid,'Демо-ответ: в дневнике можно оставить короткое описание ситуации. Обсудите заметки на встрече; одна запись не показывает общую динамику.',true,true) on conflict(id) do nothing;
insert into public.questions(id,title,body,topic,city,status,is_demo,created_at) values(md5('bb-prepared-thread-6')::uuid,'Домашнее задание оказалось сложным — как написать?','Учебная ситуация: специалист назначил задание, но дома оно не получилось. Не хочется отмечать выполнение только ради полоски. Где написать, что было трудно, и попросить пояснение?','Занятия','Алматы','answered',true,now()-make_interval(mins=>6)) on conflict(id) do nothing;
insert into public.answers(id,question_id,body,approved,is_demo) values(md5('bb-prepared-thread-6-reply-0')::uuid,md5('bb-prepared-thread-6')::uuid,'Демо-ответ: откройте «Дневник → Дома», выберите задание и нажмите «Было трудно». Комментарий поможет описать конкретную сложность.',true,true) on conflict(id) do nothing;
insert into public.answers(id,question_id,body,approved,is_demo) values(md5('bb-prepared-thread-6-reply-1')::uuid,md5('bb-prepared-thread-6')::uuid,'Демо-ответ: кнопка «Задать вопрос» позволяет написать назначившему специалисту. Не увеличивайте нагрузку самостоятельно; обсудите изменение задания.',true,true) on conflict(id) do nothing;
insert into public.questions(id,title,body,topic,city,status,is_demo,created_at) values(md5('bb-prepared-thread-7')::uuid,'Двое детей: как не перепутать задания и приёмы?','Учебная ситуация: в семье несколько детей, у каждого своё расписание. Можно ли переключать профиль, чтобы видеть отдельную цель, назначения и историю посещений, а оплату не терять?','Занятия','Алматы','answered',true,now()-make_interval(mins=>7)) on conflict(id) do nothing;
insert into public.answers(id,question_id,body,approved,is_demo) values(md5('bb-prepared-thread-7-reply-0')::uuid,md5('bb-prepared-thread-7')::uuid,'Демо-ответ: переключайте ребёнка в шапке кабинета. Цели, домашние задания и дневник относятся к выбранному профилю.',true,true) on conflict(id) do nothing;
insert into public.answers(id,question_id,body,approved,is_demo) values(md5('bb-prepared-thread-7-reply-1')::uuid,md5('bb-prepared-thread-7')::uuid,'Демо-ответ: блок «Оплата записей» в дневнике собирает ожидающие оплаты по всем детям и показывает имя ребёнка рядом с датой.',true,true) on conflict(id) do nothing;
insert into public.questions(id,title,body,topic,city,status,is_demo,created_at) values(md5('bb-prepared-thread-8')::uuid,'Какие вопросы уточнить перед обращением в ПМПК?','Учебная ситуация: хотим заранее узнать порядок обращения, но не понимаем, где проверять список документов. Какие организационные вопросы стоит задать при записи, не публикуя документы ребёнка в сообществе?','ПМПК','Алматы','answered',true,now()-make_interval(mins=>8)) on conflict(id) do nothing;
insert into public.answers(id,question_id,body,approved,is_demo) values(md5('bb-prepared-thread-8-reply-0')::uuid,md5('bb-prepared-thread-8')::uuid,'Демо-ответ: уточните порядок записи, адрес, сроки и актуальный перечень документов непосредственно в выбранной организации.',true,true) on conflict(id) do nothing;
insert into public.answers(id,question_id,body,approved,is_demo) values(md5('bb-prepared-thread-8-reply-1')::uuid,md5('bb-prepared-thread-8')::uuid,'Демо-ответ: спросите, как получить разъяснение заключения и куда обращаться с дополнительными вопросами. Не размещайте в общей ветке имена, номера документов и сканы.',true,true) on conflict(id) do nothing;
insert into public.questions(id,title,body,topic,city,status,is_demo,created_at) values(md5('bb-prepared-thread-9')::uuid,'Как обсудить заключение понятными словами?','Учебная ситуация: в заключении много незнакомых слов. Хочется спросить о практическом смысле рекомендаций и следующем шаге, а не пытаться самостоятельно поставить диагноз по обсуждению в интернете.','ПМПК','Алматы','answered',true,now()-make_interval(mins=>9)) on conflict(id) do nothing;
insert into public.answers(id,question_id,body,approved,is_demo) values(md5('bb-prepared-thread-9-reply-0')::uuid,md5('bb-prepared-thread-9')::uuid,'Демо-ответ: выпишите непонятные выражения и попросите автора заключения пояснить, что они означают именно в вашей ситуации.',true,true) on conflict(id) do nothing;
insert into public.answers(id,question_id,body,approved,is_demo) values(md5('bb-prepared-thread-9-reply-1')::uuid,md5('bb-prepared-thread-9')::uuid,'Демо-ответ: в сообществе можно обсудить организацию разговора. Интерпретацию медицинских данных и план помощи обсуждают с квалифицированным специалистом.',true,true) on conflict(id) do nothing;
insert into public.questions(id,title,body,topic,city,status,is_demo,created_at) values(md5('bb-prepared-thread-10')::uuid,'Можно ли спокойно попросить перенести встречу?','Учебная ситуация: планы изменились, а до приёма осталось несколько дней. Как заранее связаться со специалистом, уточнить условия переноса и не пропустить уведомление об изменении времени?','Поддержка','Алматы','answered',true,now()-make_interval(mins=>10)) on conflict(id) do nothing;
insert into public.answers(id,question_id,body,approved,is_demo) values(md5('bb-prepared-thread-10-reply-0')::uuid,md5('bb-prepared-thread-10')::uuid,'Демо-ответ: откройте карточку приёма в дневнике и напишите специалисту. Проверьте правило отмены в его профиле до согласования нового времени.',true,true) on conflict(id) do nothing;
insert into public.answers(id,question_id,body,approved,is_demo) values(md5('bb-prepared-thread-10-reply-1')::uuid,md5('bb-prepared-thread-10')::uuid,'Демо-ответ: при оплаченном занятии порядок переноса и возврата уточняют отдельно. Birge Bol не проверяет банковские переводы и не делает автоматический возврат.',true,true) on conflict(id) do nothing;
insert into public.questions(id,title,body,topic,city,status,is_demo,created_at) values(md5('bb-prepared-thread-11')::uuid,'Маленькие шаги семьи: что помогло организовать неделю?','Учебная ветка для обмена опытом: как хранить вопросы к встрече, делить бытовые дела и напоминать себе о расписании без перегрузки? Здесь можно поддержать друг друга без оценки ребёнка и обещаний результатов.','Поддержка','Алматы','answered',true,now()-make_interval(mins=>11)) on conflict(id) do nothing;
insert into public.answers(id,question_id,body,approved,is_demo) values(md5('bb-prepared-thread-11-reply-0')::uuid,md5('bb-prepared-thread-11')::uuid,'Демо-ответ: оставляем один короткий список вопросов и выбираем время для обсуждения расписания. Это организационный пример, а не обязательное правило для каждой семьи.',true,true) on conflict(id) do nothing;
insert into public.answers(id,question_id,body,approved,is_demo) values(md5('bb-prepared-thread-11-reply-1')::uuid,md5('bb-prepared-thread-11')::uuid,'Демо-ответ: удобно заранее уточнить, кто сопровождает ребёнка и где находится центр. Если нужна помощь, можно попросить близкого о конкретной небольшой задаче.',true,true) on conflict(id) do nothing;
