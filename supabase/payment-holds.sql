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
