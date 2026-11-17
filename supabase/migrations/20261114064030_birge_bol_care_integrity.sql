create or replace function private.review_summaries() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg((case when r.parent_id=auth.uid() or private.is_staff() then to_jsonb(r)-'evidence'-'feedback_id' else to_jsonb(r)-'evidence'-'feedback_id'-'parent_id'-'appointment_id' end)||jsonb_build_object('reviewer_key',encode(extensions.digest(r.parent_id::text||':'||r.specialist_id::text,'sha256'),'hex'))),'[]') from public.reviews r where auth.uid() is not null and (r.parent_id=auth.uid() or private.is_staff() or (r.status='verified' and r.visit_verified and (not r.is_demo or private.demo_actor())))
$$;
create or replace function private.refresh_contact_rating() returns trigger language plpgsql security definer set search_path='' as $$declare sid uuid;begin
 sid=case when tg_op='DELETE' then old.specialist_id else new.specialist_id end;
 update public.specialists s set verified_count=(select count(*) from public.reviews where specialist_id=sid and status='verified' and visit_verified),contact_rating=(select case when count(*)>=5 then round(avg(contact),1) else null end from (select parent_id,avg(contact) contact from public.reviews where specialist_id=sid and status='verified' and visit_verified group by parent_id) parents) where s.id=sid;
 return null;end$$;
alter table public.specialists add constraint at_most_three_self_strengths check(coalesce(jsonb_array_length(profile->'self_strengths'),0)<=3);
alter table public.appointments add constraint required_booking_details check(slot_id is null or (length(reason)>0 and length(contact)>0));
do $$declare definition text;begin
 select pg_get_functiondef('private.care_command(text,jsonb)'::regprocedure) into definition;
 definition=replace(definition,'  result=jsonb_build_object(''id'',aid);', '  update public.profiles set contact=coalesce(p->>''contact'','''') where id=uid;
  result=jsonb_build_object(''id'',aid);');
 definition=replace(definition,'profile=coalesce(p->''profile'',''{}'')','profile=profile||coalesce(p->''profile'',''{}'')');
 definition=replace(definition,'   insert into public.schedule_slots(specialist_id,starts_at,ends_at,service,price)',
 '   if (p->>''starts_at'')::timestamptz<=now() then raise exception ''Выберите будущее время'';end if;
   if exists(select 1 from public.specialists where id=sid and coalesce(profile->>''working_days'','''')<>'''' and strpos(lower(profile->>''working_days''),lower((array[''Вс'',''Пн'',''Вт'',''Ср'',''Чт'',''Пт'',''Сб''])[1+extract(dow from ((p->>''starts_at'')::timestamptz at time zone ''Asia/Almaty''))::integer]))=0) then raise exception ''Этот день не входит в рабочие дни'';end if;
   insert into public.schedule_slots(specialist_id,starts_at,ends_at,service,price)');
 execute definition;
end$$;
