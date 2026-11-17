create extension if not exists pg_cron with schema pg_catalog;
alter table public.appointments drop constraint appointments_status_check;
alter table public.appointments add constraint appointments_status_check check(status in ('self_reported','pending','confirmed','rescheduled','cancelled','attended','completed','expired'));
create table private.booking_payments(
 appointment_id uuid primary key references public.appointments(id) on delete cascade,
 parent_id uuid not null references auth.users(id) on delete cascade,
 specialist_id uuid not null references public.specialists(id) on delete cascade,
 state text not null check(state in ('awaiting_payment','payment_reported','confirmed','expired','cancelled')),
 amount integer not null check(amount>=0),deadline timestamptz not null,receipt_path text,
 created_at timestamptz not null default now(),claimed_at timestamptz,confirmed_at timestamptz,
 reminded_at timestamptz,provider_reminded_at timestamptz,overdue_at timestamptz,extended_at timestamptz);
create unique index one_receipt_one_appointment on private.booking_payments(receipt_path) where receipt_path is not null;
create index payment_deadline_queue on private.booking_payments(deadline) where state='awaiting_payment';
create index payment_parent_holds on private.booking_payments(parent_id,state);
create table private.provider_reliability_events(
 appointment_id uuid primary key references public.appointments(id) on delete cascade,
 specialist_id uuid not null references public.specialists(id) on delete cascade,
 created_at timestamptz not null default now());
alter table private.booking_payments enable row level security;
alter table private.provider_reliability_events enable row level security;
revoke all on private.booking_payments,private.provider_reliability_events from public,anon,authenticated;

create function private.valid_payment_receipt(p_path text,p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select p_path is not null and left(p_path,length(p_user::text)+1)=p_user::text||'/' and exists(select 1 from storage.objects where bucket_id='booking-receipts' and name=p_path)
$$;
create function private.can_read_payment_receipt(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (left(p_path,length(auth.uid()::text)+1)=auth.uid()::text||'/' or exists(select 1 from private.booking_payments p join public.specialists s on s.id=p.specialist_id where p.receipt_path=p_path and s.owner_id=auth.uid()))
$$;
revoke all on function private.valid_payment_receipt(text,uuid),private.can_read_payment_receipt(text) from public,anon,authenticated;
grant execute on function private.can_read_payment_receipt(text) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('booking-receipts','booking-receipts',false,8388608,array['image/png','image/jpeg','application/pdf']) on conflict(id) do nothing;
create policy payment_receipt_upload on storage.objects for insert to authenticated with check(bucket_id='booking-receipts' and (storage.foldername(name))[1]=auth.uid()::text and private.care_role()='parent');
create policy payment_receipt_read on storage.objects for select to authenticated using(bucket_id='booking-receipts' and private.can_read_payment_receipt(name));

create function private.process_booking_deadlines() returns jsonb language plpgsql security definer set search_path='' as $$declare p private.booking_payments;a public.appointments;processed integer=0;begin
 for p in select * from private.booking_payments where (state='awaiting_payment' and (deadline<=clock_timestamp() or (reminded_at is null and deadline-created_at>interval '2 hours' and deadline<=clock_timestamp()+interval '2 hours'))) or (state='payment_reported' and ((provider_reminded_at is null and claimed_at<=clock_timestamp()-interval '2 hours') or (overdue_at is null and claimed_at<=clock_timestamp()-interval '12 hours'))) order by deadline for update skip locked limit 200 loop
  select * into a from public.appointments where id=p.appointment_id for update;
  if a.status not in ('pending','rescheduled') then continue;end if;
  if p.state='awaiting_payment' and p.deadline<=clock_timestamp() then
   update private.booking_payments set state='expired' where appointment_id=p.appointment_id;
   update public.appointments set status='expired',proposed_slot_id=null where id=p.appointment_id;
   update public.schedule_slots set available=true where id in (a.slot_id,a.proposed_slot_id);
   perform private.care_notice(p.parent_id,'Срок оплаты истёк. Слот освобождён, можно забронировать снова.','/diary');
   processed=processed+1;
  elsif p.state='awaiting_payment' and p.reminded_at is null then
   update private.booking_payments set reminded_at=clock_timestamp() where appointment_id=p.appointment_id;
   perform private.care_notice(p.parent_id,'До конца срока оплаты осталось не более 2 часов. После оплаты нажмите «Я оплатила» и приложите чек.','/diary');
  elsif p.state='payment_reported' then
   if p.provider_reminded_at is null and p.claimed_at<=clock_timestamp()-interval '2 hours' then
    update private.booking_payments set provider_reminded_at=clock_timestamp() where appointment_id=p.appointment_id;
    perform private.care_notice((select owner_id from public.specialists where id=p.specialist_id),'Родитель заявил оплату. Проверьте чек и подтвердите получение.','/pro/requests');
   end if;
   if p.overdue_at is null and p.claimed_at<=clock_timestamp()-interval '12 hours' then
    update private.booking_payments set overdue_at=clock_timestamp() where appointment_id=p.appointment_id;
    insert into private.provider_reliability_events(appointment_id,specialist_id) values(p.appointment_id,p.specialist_id) on conflict do nothing;
    perform private.care_notice((select owner_id from public.specialists where id=p.specialist_id),'Оплата не проверена более 12 часов. Слот остаётся за родителем; показатель надёжности снижен.','/pro/requests');
    perform private.care_notice(p.parent_id,'Специалист ещё проверяет оплату. Слот остаётся за вами, повторно платить не нужно.','/diary');
   end if;
  end if;
 end loop;
 return jsonb_build_object('expired',processed);
end$$;
revoke all on function private.process_booking_deadlines() from public,anon,authenticated;

create function private.payment_policy() returns jsonb language sql stable security definer set search_path='' as $$
 select case when auth.uid() is null or private.care_role()<>'parent' then '{}'::jsonb else jsonb_build_object(
 'unpaid_count',(select count(*) from private.booking_payments where parent_id=auth.uid() and state in ('awaiting_payment','payment_reported')),
 'unpaid_limit',2,
 'unpaid_cancellations',(select count(*) from private.booking_payments where parent_id=auth.uid() and state in ('expired','cancelled') and claimed_at is null and created_at>now()-interval '30 days'),
 'receipt_required',(select count(*)>=3 from private.booking_payments where parent_id=auth.uid() and state in ('expired','cancelled') and claimed_at is null and created_at>now()-interval '30 days')) end
$$;
revoke all on function private.payment_policy() from public,anon;
grant execute on function private.payment_policy() to authenticated;

alter function private.care_command(text,jsonb) rename to care_command_core;
revoke all on function private.care_command_core(text,jsonb) from public,anon,authenticated;
create function private.care_command(p_action text,p jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid=auth.uid();rol text;result jsonb;pay private.booking_payments;a public.appointments;sl public.schedule_slots;policy jsonb;receipt text;new_deadline timestamptz;provider_allowed boolean;begin
 if uid is null then raise exception 'Войдите в аккаунт';end if;
 rol=private.care_role();
 if p_action in ('book','payment_claim','payment_confirm','payment_extend') then perform private.process_booking_deadlines();end if;
 if p_action='book' then
  if rol<>'parent' then raise exception 'Запись доступна родителю';end if;
  select * into sl from public.schedule_slots where id=(p->>'slot_id')::uuid;
  if sl.id is not null and sl.price=0 then return private.care_command_core(p_action,p);end if;
  perform pg_advisory_xact_lock(hashtextextended('payment-parent:'||uid::text,0));
  policy=private.payment_policy();
  if (policy->>'unpaid_count')::integer>=2 then raise exception 'Одновременно можно держать не больше двух неоплаченных броней';end if;
  receipt=nullif(p->>'receipt_path','');
  if (policy->>'receipt_required')::boolean and not private.valid_payment_receipt(receipt,uid) then raise exception 'После серии неоплаченных броней для новой записи сначала приложите чек';end if;
  if receipt is not null and not private.valid_payment_receipt(receipt,uid) then raise exception 'Чек недоступен. Загрузите файл в своём аккаунте';end if;
  result=private.care_command_core(p_action,p);
  select * into a from public.appointments where id=(result->>'id')::uuid;
  select * into sl from public.schedule_slots where id=a.slot_id;
  if (a.starts_at at time zone 'Asia/Almaty')::date<=(clock_timestamp() at time zone 'Asia/Almaty')::date+1 then new_deadline=least(clock_timestamp()+interval '2 hours',a.starts_at);
  else new_deadline=least(clock_timestamp()+interval '24 hours',a.starts_at-interval '6 hours');end if;
  if new_deadline<=clock_timestamp() then raise exception 'Для этого времени уже нельзя создать бронь без оплаты';end if;
  insert into private.booking_payments(appointment_id,parent_id,specialist_id,state,amount,deadline,receipt_path,claimed_at)
  values(a.id,uid,a.specialist_id,case when receipt is null then 'awaiting_payment' else 'payment_reported' end,sl.price,new_deadline,receipt,case when receipt is null then null else clock_timestamp() end);
  perform private.care_notice(uid,'Бронь создана. Оплатите до '||to_char(new_deadline at time zone 'Asia/Almaty','DD.MM HH24:MI')||' по времени Алматы. Каждое занятие оплачивается отдельно.','/diary');
  if receipt is not null then perform private.care_notice((select owner_id from public.specialists where id=a.specialist_id),'Родитель приложил чек к брони. Проверьте получение оплаты.','/pro/requests');end if;
  return result||jsonb_build_object('payment_state',case when receipt is null then 'awaiting_payment' else 'payment_reported' end,'payment_deadline',new_deadline);
 end if;
 if p ? 'appointment_id' and p->>'appointment_id' is not null then
  select * into pay from private.booking_payments where appointment_id=(p->>'appointment_id')::uuid for update;
 end if;
 if p_action in ('payment_claim','payment_confirm','payment_extend','payment_receipt') then
  if pay.appointment_id is null then raise exception 'Бронь не найдена';end if;
  select * into a from public.appointments where id=pay.appointment_id for update;
  provider_allowed=exists(select 1 from public.specialists where id=a.specialist_id and owner_id=uid) or exists(select 1 from public.clinics where id=a.clinic_id and owner_id=uid);
  if p_action='payment_claim' then
   if a.parent_id<>uid or rol<>'parent' then raise exception 'Нет доступа к брони';end if;
   if pay.state<>'awaiting_payment' or a.status<>'pending' or pay.deadline<=clock_timestamp() then raise exception 'Срок оплаты истёк или оплата уже заявлена';end if;
   receipt=p->>'receipt_path';
   if not private.valid_payment_receipt(receipt,uid) then raise exception 'Приложите чек из своего аккаунта';end if;
   update private.booking_payments set state='payment_reported',claimed_at=clock_timestamp(),receipt_path=receipt where appointment_id=a.id;
   perform private.care_notice((select owner_id from public.specialists where id=a.specialist_id),'Родитель нажал «Я оплатила» и приложил чек. Проверьте оплату. Таймер заморожен.','/pro/requests');
   return jsonb_build_object('payment_state','payment_reported');
  elsif p_action='payment_confirm' then
   if not provider_allowed then raise exception 'Нет доступа к подтверждению оплаты';end if;
   if pay.state not in ('awaiting_payment','payment_reported') or a.status<>'pending' then raise exception 'Оплата уже подтверждена или бронь завершена';end if;
   if not coalesce((p->>'received')::boolean,false) then raise exception 'Подтвердите, что деньги поступили вне приложения';end if;
   result=private.care_command_core('confirm',jsonb_build_object('appointment_id',a.id));
   update private.booking_payments set state='confirmed',confirmed_at=clock_timestamp() where appointment_id=a.id;
   return result||jsonb_build_object('payment_state','confirmed');
  elsif p_action='payment_extend' then
   if not provider_allowed then raise exception 'Продлить бронь может специалист или клиника';end if;
   if pay.state<>'awaiting_payment' then raise exception 'Продление доступно только до заявления оплаты';end if;
   new_deadline=(p->>'deadline')::timestamptz;
   if new_deadline<=pay.deadline or new_deadline>least(clock_timestamp()+interval '48 hours',a.starts_at) then raise exception 'Новый срок должен быть позже прежнего, до начала приёма и не дальше 48 часов';end if;
   update private.booking_payments set deadline=new_deadline,extended_at=clock_timestamp(),reminded_at=null where appointment_id=a.id;
   perform private.care_notice(a.parent_id,'Специалист продлил оплату до '||to_char(new_deadline at time zone 'Asia/Almaty','DD.MM HH24:MI')||' по времени Алматы.','/diary');
   return jsonb_build_object('payment_deadline',new_deadline);
  else
   if a.parent_id<>uid and not exists(select 1 from public.specialists where id=a.specialist_id and owner_id=uid) then raise exception 'Чек доступен только родителю и его специалисту';end if;
   return jsonb_build_object('path',pay.receipt_path);
  end if;
 end if;
 if pay.appointment_id is not null then
  if p_action='confirm' and pay.state<>'confirmed' then raise exception 'Сначала подтвердите получение оплаты';end if;
  if p_action in ('propose','accept_time') and pay.state<>'confirmed' then raise exception 'Перенос доступен после подтверждения оплаты; до этого можно продлить бронь или отменить её';end if;
 end if;
 result=private.care_command_core(p_action,p);
 if p_action='cancel' and pay.appointment_id is not null then
  update private.booking_payments set state='cancelled' where appointment_id=pay.appointment_id;
  if pay.claimed_at is not null then perform private.care_notice(pay.parent_id,'Запись отменена. Вопрос возврата оплаты согласуйте со специалистом: приложение не списывает и не возвращает деньги.','/diary');end if;
 end if;
 return result;
end$$;
revoke all on function private.care_command(text,jsonb) from public,anon;
grant execute on function private.care_command(text,jsonb) to authenticated;
create or replace function public.care_command(p_action text,p jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.care_command(p_action,p)$$;
revoke all on function public.care_command(text,jsonb) from public,anon;
grant execute on function public.care_command(text,jsonb) to authenticated;

create function private.payment_snapshot() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('appointment_id',p.appointment_id,'payment_state',p.state,'payment_amount',p.amount,'payment_deadline',p.deadline,'payment_claimed_at',p.claimed_at,'payment_confirmed_at',p.confirmed_at,'payment_review_overdue',p.overdue_at is not null,'payment_receipt_available',p.receipt_path is not null and (p.parent_id=auth.uid() or s.owner_id=auth.uid()))),'[]')
 from private.booking_payments p join public.appointments a on a.id=p.appointment_id join public.specialists s on s.id=p.specialist_id left join public.clinics c on c.id=a.clinic_id
 where auth.uid() is not null and (p.parent_id=auth.uid() or s.owner_id=auth.uid() or c.owner_id=auth.uid())
$$;
create function private.reliability_snapshot() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(r)),'[]') from (select specialist_id,count(*) late_confirmations,greatest(0,100-count(*)*5) score from private.provider_reliability_events group by specialist_id) r where auth.uid() is not null
$$;
revoke all on function private.payment_snapshot(),private.reliability_snapshot() from public,anon;
grant execute on function private.payment_snapshot(),private.reliability_snapshot() to authenticated;
alter function public.care_snapshot() set schema private;
alter function private.care_snapshot() rename to care_snapshot_core;
create function public.care_snapshot() returns jsonb language plpgsql security invoker set search_path='' as $$declare result jsonb;payments jsonb;appointments jsonb;begin
 result=private.care_snapshot_core();payments=private.payment_snapshot();
 select coalesce(jsonb_agg(a||coalesce((select p-'appointment_id' from jsonb_array_elements(payments) p where p->>'appointment_id'=a->>'id'),'{}'::jsonb)),'[]') into appointments from jsonb_array_elements(result->'appointments') a;
 return jsonb_set(result,'{appointments}',appointments)||jsonb_build_object('payment_policy',private.payment_policy(),'reliability',private.reliability_snapshot());
end$$;
revoke all on function public.care_snapshot() from public,anon;
grant execute on function public.care_snapshot() to authenticated;
-- Calendar subscribers also see tentative holds and their later expiry/cancellation.
do $$declare definition text;begin
 select pg_get_functiondef('private.calendar_feed(text)'::regprocedure) into definition;
 definition=replace(definition,'''confirmed'',''rescheduled'',''attended'',''completed'',''cancelled''','''pending'',''confirmed'',''rescheduled'',''attended'',''completed'',''cancelled'',''expired''');
 definition=replace(definition,'order by a.starts_at limit 200','order by a.starts_at');
 execute definition;
end$$;
select cron.schedule('birge-bol-payment-holds','* * * * *','select private.process_booking_deadlines();');

create table public.app_graph_nodes(id text primary key,label text not null,kind text not null,routes jsonb not null,roles text[] not null,tables text[] not null,description text not null,x numeric not null,y numeric not null);
create table public.app_graph_edges(source text references public.app_graph_nodes(id) on delete cascade,target text references public.app_graph_nodes(id) on delete cascade,relation text not null,key text,primary key(source,target,relation));
create table public.app_graph_keywords(node_id text references public.app_graph_nodes(id) on delete cascade,keyword text not null,primary key(node_id,keyword));
create index app_graph_keyword_search on public.app_graph_keywords(keyword);
alter table public.app_graph_nodes enable row level security;
alter table public.app_graph_edges enable row level security;
alter table public.app_graph_keywords enable row level security;
revoke all on public.app_graph_nodes,public.app_graph_edges,public.app_graph_keywords from public,anon,authenticated;
grant select on public.app_graph_nodes,public.app_graph_edges,public.app_graph_keywords to authenticated;
create policy role_nodes on public.app_graph_nodes for select to authenticated using(private.care_role()=any(roles) or private.is_staff());
create policy role_edges on public.app_graph_edges for select to authenticated using(exists(select 1 from public.app_graph_nodes n where n.id=source) and exists(select 1 from public.app_graph_nodes n where n.id=target));
create policy role_keywords on public.app_graph_keywords for select to authenticated using(exists(select 1 from public.app_graph_nodes n where n.id=node_id));
insert into public.app_graph_nodes values('birge','Birge Bol','root','{"parent":"/app","specialist":"/pro","clinic":"/clinic"}'::jsonb,'{parent,specialist,clinic}'::text[],'{}'::text[],'Связи разделов и данных платформы',600,440);
insert into public.app_graph_keywords values('birge','платформа');
insert into public.app_graph_keywords values('birge','главная');
insert into public.app_graph_keywords values('birge','помощь');
insert into public.app_graph_nodes values('family','Дети и семья','screen','{"parent":"/child","specialist":"/pro/kids"}'::jsonb,'{parent,specialist}'::text[],'{children,child_goals}'::text[],'Профили детей, цели и разрешённые данные',600,200);
insert into public.app_graph_keywords values('family','дети');
insert into public.app_graph_keywords values('family','ребёнок');
insert into public.app_graph_keywords values('family','ребенок');
insert into public.app_graph_keywords values('family','семья');
insert into public.app_graph_keywords values('family','профиль');
insert into public.app_graph_keywords values('family','цель');
insert into public.app_graph_nodes values('providers','Специалисты','screen','{"parent":"/find","specialist":"/pro/profile","clinic":"/clinic"}'::jsonb,'{parent,specialist,clinic}'::text[],'{specialists,schedule_slots}'::text[],'Карточки специалистов и свободное время',900,310);
insert into public.app_graph_keywords values('providers','специалист');
insert into public.app_graph_keywords values('providers','логопед');
insert into public.app_graph_keywords values('providers','поиск');
insert into public.app_graph_keywords values('providers','найти');
insert into public.app_graph_keywords values('providers','свободно');
insert into public.app_graph_keywords values('providers','время');
insert into public.app_graph_keywords values('providers','окна');
insert into public.app_graph_nodes values('booking','Записи и календарь','screen','{"parent":"/diary","specialist":"/pro/requests","clinic":"/clinic"}'::jsonb,'{parent,specialist,clinic}'::text[],'{appointments,schedule_slots}'::text[],'Единая запись связывает семью, специалиста, время и оплату',900,590);
insert into public.app_graph_keywords values('booking','запись');
insert into public.app_graph_keywords values('booking','записаться');
insert into public.app_graph_keywords values('booking','приём');
insert into public.app_graph_keywords values('booking','прием');
insert into public.app_graph_keywords values('booking','бронь');
insert into public.app_graph_keywords values('booking','календарь');
insert into public.app_graph_keywords values('booking','гугл');
insert into public.app_graph_keywords values('booking','google');
insert into public.app_graph_keywords values('booking','перенести');
insert into public.app_graph_keywords values('booking','отменить');
insert into public.app_graph_nodes values('payments','Оплата и чеки','screen','{"parent":"/diary","specialist":"/pro/requests","clinic":"/clinic"}'::jsonb,'{parent,specialist,clinic}'::text[],'{private.booking_payments,storage.objects}'::text[],'Срок оплаты, закрытый чек и подтверждение поступления денег',600,710);
insert into public.app_graph_keywords values('payments','оплата');
insert into public.app_graph_keywords values('payments','оплатила');
insert into public.app_graph_keywords values('payments','чек');
insert into public.app_graph_keywords values('payments','деньги');
insert into public.app_graph_keywords values('payments','таймер');
insert into public.app_graph_keywords values('payments','продлить');
insert into public.app_graph_keywords values('payments','истекло');
insert into public.app_graph_keywords values('payments','бронь');
insert into public.app_graph_nodes values('clinics','Клиники и команда','screen','{"parent":"/clinics","specialist":"/clinics","clinic":"/clinic"}'::jsonb,'{parent,specialist,clinic}'::text[],'{clinics,clinic_members,clinic_branches}'::text[],'Клиника связана со специалистами через состав команды',300,590);
insert into public.app_graph_keywords values('clinics','клиника');
insert into public.app_graph_keywords values('clinics','центр');
insert into public.app_graph_keywords values('clinics','команда');
insert into public.app_graph_keywords values('clinics','филиал');
insert into public.app_graph_keywords values('clinics','ватсап');
insert into public.app_graph_keywords values('clinics','whatsapp');
insert into public.app_graph_keywords values('clinics','telegram');
insert into public.app_graph_keywords values('clinics','написать');
insert into public.app_graph_keywords values('clinics','связаться');
insert into public.app_graph_nodes values('reviews','Посещение и отзывы','screen','{"parent":"/check-in","specialist":"/pro","clinic":"/clinic"}'::jsonb,'{parent,specialist,clinic}'::text[],'{private.specialist_qr_codes,private.visit_confirmations,reviews}'::text[],'Серверная отметка посещения открывает один отзыв за приём',300,310);
insert into public.app_graph_keywords values('reviews','qr');
insert into public.app_graph_keywords values('reviews','куар');
insert into public.app_graph_keywords values('reviews','сканировать');
insert into public.app_graph_keywords values('reviews','посещение');
insert into public.app_graph_keywords values('reviews','отзыв');
insert into public.app_graph_keywords values('reviews','рейтинг');
insert into public.app_graph_keywords values('reviews','оценка');
insert into public.app_graph_keywords values('reviews','подтвердить');
insert into public.app_graph_nodes values('children_data','Профили детей','data','{}'::jsonb,'{parent,specialist}'::text[],'{children}'::text[],'parent_id связывает ребёнка с аккаунтом родителя; доступ ограничен ролью и согласием',600,75);
insert into public.app_graph_keywords values('children_data','children');
insert into public.app_graph_keywords values('children_data','parent_id');
insert into public.app_graph_keywords values('children_data','ребёнок');
insert into public.app_graph_keywords values('children_data','согласие');
insert into public.app_graph_nodes values('slots_data','Свободные окна','data','{}'::jsonb,'{parent,specialist,clinic}'::text[],'{schedule_slots}'::text[],'specialist_id → specialists.id; доступность меняется при брони и освобождении',1080,180);
insert into public.app_graph_keywords values('slots_data','schedule_slots');
insert into public.app_graph_keywords values('slots_data','specialist_id');
insert into public.app_graph_keywords values('slots_data','свободно');
insert into public.app_graph_keywords values('slots_data','слот');
insert into public.app_graph_keywords values('slots_data','расписание');
insert into public.app_graph_nodes values('appointments_data','Единая запись','data','{}'::jsonb,'{parent,specialist,clinic}'::text[],'{appointments}'::text[],'child_id → children.id; specialist_id → specialists.id; slot_id → schedule_slots.id',1080,730);
insert into public.app_graph_keywords values('appointments_data','appointments');
insert into public.app_graph_keywords values('appointments_data','child_id');
insert into public.app_graph_keywords values('appointments_data','slot_id');
insert into public.app_graph_keywords values('appointments_data','specialist_id');
insert into public.app_graph_keywords values('appointments_data','статус');
insert into public.app_graph_nodes values('receipt_data','Закрытый чек','data','{}'::jsonb,'{parent,specialist}'::text[],'{private.booking_payments,storage.objects}'::text[],'appointment_id → appointments.id; файл доступен только родителю и назначенному специалисту',600,855);
insert into public.app_graph_keywords values('receipt_data','receipt');
insert into public.app_graph_keywords values('receipt_data','чек');
insert into public.app_graph_keywords values('receipt_data','оплата');
insert into public.app_graph_keywords values('receipt_data','storage');
insert into public.app_graph_keywords values('receipt_data','приватно');
insert into public.app_graph_nodes values('team_data','Состав клиники','data','{}'::jsonb,'{parent,specialist,clinic}'::text[],'{clinic_members}'::text[],'clinic_id → clinics.id; specialist_id → specialists.id',120,730);
insert into public.app_graph_keywords values('team_data','clinic_members');
insert into public.app_graph_keywords values('team_data','clinic_id');
insert into public.app_graph_keywords values('team_data','specialist_id');
insert into public.app_graph_keywords values('team_data','команда');
insert into public.app_graph_nodes values('rating_data','Проверенный отзыв','data','{}'::jsonb,'{parent,specialist,clinic}'::text[],'{reviews,private.review_case_features}'::text[],'UNIQUE appointment_id: один отзыв на посещение; для похожих случаев нужно отдельное согласие',120,180);
insert into public.app_graph_keywords values('rating_data','reviews');
insert into public.app_graph_keywords values('rating_data','appointment_id');
insert into public.app_graph_keywords values('rating_data','формула');
insert into public.app_graph_keywords values('rating_data','похожие');
insert into public.app_graph_keywords values('rating_data','рейтинг');
insert into public.app_graph_nodes values('tasks','Цели и задания','screen','{"parent":"/diary?tab=home","specialist":"/pro/tasks"}'::jsonb,'{parent,specialist}'::text[],'{child_goals,task_assignments,task_completions}'::text[],'Назначение связывает ребёнка, специалиста и материал; выполнение попадает в дневник',600,320);
insert into public.app_graph_keywords values('tasks','задания');
insert into public.app_graph_keywords values('tasks','дома');
insert into public.app_graph_keywords values('tasks','цель');
insert into public.app_graph_keywords values('tasks','дневник');
insert into public.app_graph_keywords values('tasks','материал');
insert into public.app_graph_keywords values('tasks','видео');
insert into public.app_graph_nodes values('community','Сообщество','screen','{"parent":"/moms"}'::jsonb,'{parent}'::text[],'{questions,answers}'::text[],'Вопросы и опыт родителей',370,440);
insert into public.app_graph_keywords values('community','мамы');
insert into public.app_graph_keywords values('community','сообщество');
insert into public.app_graph_keywords values('community','вопрос');
insert into public.app_graph_keywords values('community','поддержка');
insert into public.app_graph_keywords values('community','аналар');
insert into public.app_graph_nodes values('profile','Личный профиль','screen','{"parent":"/profile","specialist":"/pro/profile","clinic":"/clinic"}'::jsonb,'{parent,specialist,clinic}'::text[],'{profiles,user_roles}'::text[],'Роль, собственный контакт и настройки своего кабинета',850,75);
insert into public.app_graph_keywords values('profile','профиль');
insert into public.app_graph_keywords values('profile','контакт');
insert into public.app_graph_keywords values('profile','почта');
insert into public.app_graph_keywords values('profile','имя');
insert into public.app_graph_keywords values('profile','аккаунт');
insert into public.app_graph_keywords values('profile','профиль семьи');
insert into public.app_graph_nodes values('settings','Настройки','screen','{"parent":"/settings","specialist":"/settings","clinic":"/settings"}'::jsonb,'{parent,specialist,clinic}'::text[],'{profiles}'::text[],'Язык, установка приложения и параметры аккаунта',350,75);
insert into public.app_graph_keywords values('settings','настройки');
insert into public.app_graph_keywords values('settings','язык');
insert into public.app_graph_keywords values('settings','установка');
insert into public.app_graph_keywords values('settings','приложение');
insert into public.app_graph_keywords values('settings','баптау');
insert into public.app_graph_nodes values('explain','Простым языком','screen','{"parent":"/explain","specialist":"/explain","clinic":"/explain"}'::jsonb,'{parent,specialist,clinic}'::text[],'{}'::text[],'Общие объяснения терминов без передачи данных ребёнка внешнему ИИ',120,440);
insert into public.app_graph_keywords values('explain','объяснить');
insert into public.app_graph_keywords values('explain','термин');
insert into public.app_graph_keywords values('explain','заключение');
insert into public.app_graph_keywords values('explain','словарь');
insert into public.app_graph_keywords values('explain','простыми словами');
insert into public.app_graph_nodes values('compare','Сравнение','screen','{"parent":"/compare"}'::jsonb,'{parent}'::text[],'{specialists,reviews,private.review_case_features}'::text[],'Сравнение двух-трёх специалистов по условиям и рейтингам',1080,75);
insert into public.app_graph_keywords values('compare','сравнить');
insert into public.app_graph_keywords values('compare','сравнение');
insert into public.app_graph_keywords values('compare','выбрать');
insert into public.app_graph_keywords values('compare','рейтинг');
insert into public.app_graph_keywords values('compare','похожие случаи');
insert into public.app_graph_nodes values('notifications','Уведомления','screen','{"parent":"/notifications","specialist":"/notifications","clinic":"/notifications"}'::jsonb,'{parent,specialist,clinic}'::text[],'{notifications}'::text[],'Сообщения о записях, сроках оплаты и действиях специалиста',850,855);
insert into public.app_graph_keywords values('notifications','уведомления');
insert into public.app_graph_keywords values('notifications','напоминания');
insert into public.app_graph_keywords values('notifications','новости');
insert into public.app_graph_keywords values('notifications','подтверждение');
insert into public.app_graph_keywords values('notifications','хабарлама');
insert into public.app_graph_nodes values('moderation','Модерация','screen','{"admin":"/admin","moderator":"/admin"}'::jsonb,'{admin,moderator}'::text[],'{reviews,review_reports,specialists}'::text[],'Проверка публикаций уполномоченными сотрудниками',350,855);
insert into public.app_graph_keywords values('moderation','модерация');
insert into public.app_graph_keywords values('moderation','проверка');
insert into public.app_graph_keywords values('moderation','жалоба');
insert into public.app_graph_keywords values('moderation','отзывы');
insert into public.app_graph_edges values('birge','family','раздел',null);
insert into public.app_graph_edges values('birge','providers','раздел',null);
insert into public.app_graph_edges values('birge','booking','раздел',null);
insert into public.app_graph_edges values('birge','payments','раздел',null);
insert into public.app_graph_edges values('birge','clinics','раздел',null);
insert into public.app_graph_edges values('birge','reviews','раздел',null);
insert into public.app_graph_edges values('family','children_data','данные','parent_id');
insert into public.app_graph_edges values('providers','slots_data','расписание','specialist_id');
insert into public.app_graph_edges values('booking','appointments_data','единая запись','id');
insert into public.app_graph_edges values('payments','receipt_data','подтверждает оплату','appointment_id');
insert into public.app_graph_edges values('clinics','team_data','команда','clinic_id + specialist_id');
insert into public.app_graph_edges values('reviews','rating_data','проверенное посещение','appointment_id');
insert into public.app_graph_edges values('children_data','appointments_data','ребёнок в записи','child_id → children.id');
insert into public.app_graph_edges values('slots_data','appointments_data','окно записи','slot_id → schedule_slots.id');
insert into public.app_graph_edges values('receipt_data','appointments_data','оплата занятия','appointment_id → appointments.id');
insert into public.app_graph_edges values('rating_data','appointments_data','отзыв за приём','appointment_id → appointments.id');
insert into public.app_graph_edges values('team_data','providers','специалист клиники','specialist_id → specialists.id');
insert into public.app_graph_edges values('family','tasks','цель ребёнка','child_id');
insert into public.app_graph_edges values('providers','tasks','назначение','specialist_id');
insert into public.app_graph_edges values('tasks','booking','работа после приёма','child_id + specialist_id');
insert into public.app_graph_edges values('community','family','опыт семьи','parent_id');
insert into public.app_graph_edges values('payments','booking','закрепляет слот','appointment_id');
insert into public.app_graph_edges values('reviews','providers','рейтинг специалиста','specialist_id');
insert into public.app_graph_edges values('profile','family','свой профиль','parent_id');
insert into public.app_graph_edges values('profile','settings','настройки аккаунта','user_id');
insert into public.app_graph_edges values('explain','family','общая справка без персональных данных',null);
insert into public.app_graph_edges values('compare','providers','сравниваемые карточки','specialist_id');
insert into public.app_graph_edges values('compare','rating_data','оценки и похожие случаи','specialist_id');
insert into public.app_graph_edges values('notifications','booking','изменение записи','parent_id → auth.users.id');
insert into public.app_graph_edges values('notifications','payments','сроки и подтверждение оплаты','parent_id → auth.users.id');
insert into public.app_graph_edges values('moderation','reviews','проверка публикации','review_id');
create function public.app_navigation_graph() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('nodes',(select coalesce(jsonb_agg(to_jsonb(n)||jsonb_build_object('route',n.routes->>private.care_role(),'keywords',(select coalesce(jsonb_agg(k.keyword),'[]') from public.app_graph_keywords k where k.node_id=n.id))),'[]') from public.app_graph_nodes n),'edges',(select coalesce(jsonb_agg(to_jsonb(e)),'[]') from public.app_graph_edges e)) where auth.uid() is not null
$$;
revoke all on function public.app_navigation_graph() from public,anon;
grant execute on function public.app_navigation_graph() to authenticated;

