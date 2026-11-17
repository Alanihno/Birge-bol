-- Printed provider QR, server attendance verification, revocable read-only calendar feeds.
alter table public.appointments add column if not exists visited_at timestamptz;
alter table public.appointments add column if not exists updated_at timestamptz not null default now();
create table private.specialist_qr_codes(
 specialist_id uuid primary key references public.specialists(id) on delete cascade,
 code uuid not null unique default gen_random_uuid(),created_at timestamptz not null default now());
create table private.visit_confirmations(
 appointment_id uuid primary key references public.appointments(id) on delete cascade,
 parent_id uuid not null references auth.users(id) on delete cascade,
 specialist_id uuid not null references public.specialists(id) on delete cascade,
 confirmed_at timestamptz not null default now(),method text not null default 'printed_qr');
create table private.checkin_attempts(user_id uuid primary key references auth.users(id) on delete cascade,window_at timestamptz not null,hits integer not null);
create table private.calendar_links(user_id uuid primary key references auth.users(id) on delete cascade,token_hash text not null unique,expires_at timestamptz not null,created_at timestamptz not null default now());
alter table private.specialist_qr_codes enable row level security;
alter table private.visit_confirmations enable row level security;
alter table private.checkin_attempts enable row level security;
alter table private.calendar_links enable row level security;
revoke all on private.specialist_qr_codes,private.visit_confirmations,private.checkin_attempts,private.calendar_links from public,anon,authenticated;

create function private.appointment_modified() returns trigger language plpgsql set search_path='' as $$begin new.updated_at=clock_timestamp();return new;end$$;
revoke all on function private.appointment_modified() from public,anon,authenticated;
create trigger appointment_modified before update on public.appointments for each row execute function private.appointment_modified();

create function private.specialist_qr(p_rotate boolean) returns jsonb language plpgsql security definer set search_path='' as $$declare sid uuid;result jsonb;begin
 if auth.uid() is null or private.care_role()<>'specialist' then raise exception 'Доступно специалисту';end if;
 select id into sid from public.specialists where owner_id=auth.uid() order by id limit 1;
 if sid is null then raise exception 'Профиль специалиста не найден';end if;
 insert into private.specialist_qr_codes(specialist_id) values(sid) on conflict(specialist_id) do nothing;
 if p_rotate then update private.specialist_qr_codes set code=gen_random_uuid(),created_at=clock_timestamp() where specialist_id=sid;end if;
 select jsonb_build_object('code',code,'specialist_id',sid) into result from private.specialist_qr_codes where specialist_id=sid;
 return result;
end$$;

create function private.confirm_qr(p_code text,p_appointment_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid=auth.uid();sid uuid;a public.appointments;hits integer;choices jsonb;checked_at timestamptz=clock_timestamp();begin
 if uid is null or private.care_role()<>'parent' then raise exception 'Войдите как родитель';end if;
 insert into private.checkin_attempts(user_id,window_at,hits) values(uid,checked_at,1)
 on conflict(user_id) do update set hits=case when private.checkin_attempts.window_at<checked_at-interval '1 minute' then 1 else private.checkin_attempts.hits+1 end,window_at=case when private.checkin_attempts.window_at<checked_at-interval '1 minute' then checked_at else private.checkin_attempts.window_at end returning private.checkin_attempts.hits into hits;
 if hits>20 then return jsonb_build_object('error','Слишком много попыток. Повторите через минуту.');end if;
 if p_code is null or p_code !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then return jsonb_build_object('error','QR-код не распознан');end if;
 select q.specialist_id into sid from private.specialist_qr_codes q join public.specialists s on s.id=q.specialist_id where q.code=p_code::uuid and s.published and s.verification_status='approved';
 if sid is null then return jsonb_build_object('error','QR-код недействителен или заменён специалистом');end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'starts_at',b.starts_at,'service',b.service,'child',c.label) order by b.starts_at),'[]') into choices from public.appointments b join public.children c on c.id=b.child_id and c.parent_id=uid where b.parent_id=uid and b.specialist_id=sid and b.status='confirmed' and not b.visit_verified and (p_appointment_id is null or b.id=p_appointment_id) and checked_at between b.starts_at-interval '30 minutes' and coalesce(b.ends_at,b.starts_at+interval '45 minutes')+interval '2 hours';
 if jsonb_array_length(choices)=0 then return jsonb_build_object('error','Нет подтверждённой записи в допустимое время. Отметиться можно за 30 минут до приёма и до 2 часов после окончания. Уже отмеченный приём повторно не подтверждается.');end if;
 if jsonb_array_length(choices)>1 then return jsonb_build_object('choose',true,'appointments',choices);end if;
 select * into a from public.appointments where id=(choices->0->>'id')::uuid and parent_id=uid and specialist_id=sid and status='confirmed' and not visit_verified for update;
 if a.id is null then return jsonb_build_object('error','Посещение уже подтверждено или запись изменена');end if;
 if clock_timestamp() not between a.starts_at-interval '30 minutes' and coalesce(a.ends_at,a.starts_at+interval '45 minutes')+interval '2 hours' then return jsonb_build_object('error','Время подтверждения истекло');end if;
 insert into private.visit_confirmations(appointment_id,parent_id,specialist_id,confirmed_at) values(a.id,uid,sid,checked_at);
 update public.appointments set status='completed',visit_verified=true,visited_at=checked_at where id=a.id;
 perform private.care_notice(uid,'Посещение подтверждено. Можно оставить отзыв.','/feedback/'||a.id);
 return jsonb_build_object('id',a.id,'visited_at',checked_at,'status','completed');
end$$;

create function public.care_specialist_qr(p_rotate boolean default false) returns jsonb language sql security invoker set search_path='' as $$select private.specialist_qr(p_rotate)$$;
create function public.care_confirm_qr(p_code text,p_appointment_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$select private.confirm_qr(p_code,p_appointment_id)$$;
revoke all on function private.specialist_qr(boolean),private.confirm_qr(text,uuid),public.care_specialist_qr(boolean),public.care_confirm_qr(text,uuid) from public,anon;
grant execute on function private.specialist_qr(boolean),private.confirm_qr(text,uuid),public.care_specialist_qr(boolean),public.care_confirm_qr(text,uuid) to authenticated;

create function private.calendar_link(p_revoke boolean) returns jsonb language plpgsql security definer set search_path='' as $$declare token text;uid uuid=auth.uid();begin
 if uid is null or private.care_role() not in ('parent','specialist','clinic') then raise exception 'Войдите в личный кабинет';end if;
 delete from private.calendar_links where user_id=uid;
 if p_revoke then return jsonb_build_object('revoked',true);end if;
 token=encode(extensions.gen_random_bytes(32),'hex');
 insert into private.calendar_links(user_id,token_hash,expires_at) values(uid,encode(extensions.digest(token,'sha256'),'hex'),clock_timestamp()+interval '1 year');
 return jsonb_build_object('token',token,'expires_at',clock_timestamp()+interval '1 year');
end$$;
create function public.care_calendar_link(p_revoke boolean default false) returns jsonb language sql security invoker set search_path='' as $$select private.calendar_link(p_revoke)$$;
revoke all on function private.calendar_link(boolean),public.care_calendar_link(boolean) from public,anon;
grant execute on function private.calendar_link(boolean),public.care_calendar_link(boolean) to authenticated;

create function private.calendar_feed(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$declare uid uuid;rol text;result jsonb;begin
 if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return null;end if;
 select user_id into uid from private.calendar_links where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and expires_at>clock_timestamp();
 if uid is null then return null;end if;
 select role into rol from public.user_roles where user_id=uid;
 select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'starts_at',v.starts_at,'ends_at',coalesce(v.ends_at,v.starts_at+interval '45 minutes'),'status',v.status,'updated_at',v.updated_at,'title','Приём · Birge Bol') order by v.starts_at),'[]') into result from (
  select a.id,a.starts_at,a.ends_at,a.status,a.updated_at from public.appointments a
  where a.starts_at between clock_timestamp()-interval '30 days' and clock_timestamp()+interval '1 year'
  and a.status in ('confirmed','rescheduled','attended','completed','cancelled')
  and ((rol='parent' and a.parent_id=uid) or (rol='specialist' and exists(select 1 from public.specialists s where s.id=a.specialist_id and s.owner_id=uid)) or (rol='clinic' and exists(select 1 from public.clinics c where c.id=a.clinic_id and c.owner_id=uid))) order by a.starts_at limit 200
 ) v;
 return jsonb_build_object('appointments',result);
end$$;
create function public.care_calendar_feed(p_token text) returns jsonb language sql security invoker set search_path='' as $$select private.calendar_feed(p_token)$$;
revoke all on function private.calendar_feed(text),public.care_calendar_feed(text) from public,anon,authenticated;
grant execute on function private.calendar_feed(text),public.care_calendar_feed(text) to service_role;
