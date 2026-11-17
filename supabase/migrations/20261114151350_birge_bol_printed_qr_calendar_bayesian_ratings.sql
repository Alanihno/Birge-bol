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

alter table public.children add column if not exists case_group text not null default 'unknown' check(case_group in ('unknown','speech','autism','learning','attention','other'));
alter table public.appointments add column if not exists visit_format text not null default 'offline' check(visit_format in ('offline','online'));
create table private.review_case_features(
 review_id uuid primary key references public.reviews(id) on delete cascade,
 age numeric not null,case_group text not null,visit_format text not null,
 consented_at timestamptz not null default now());
alter table private.review_case_features enable row level security;
revoke all on private.review_case_features from public,anon,authenticated;
create function private.rating_age(p_age text) returns numeric language sql immutable set search_path='' as $$select case p_age when '2–3' then 2.5 when '4–5' then 4.5 when '6–8' then 7 when '9–12' then 10.5 else null end$$;
revoke all on function private.rating_age(text) from public,anon,authenticated;

create function private.rating_values(p_age numeric,p_group text,p_format text)
returns table(specialist_id uuid,overall numeric,similar numeric,review_count bigint,similar_count bigint,effective_similar numeric,platform_mean numeric)
language sql stable security definer set search_path='' as $$
 with approved as (
  select r.id,r.specialist_id,r.contact,r.is_demo,exp(-greatest(0,extract(epoch from (now()-r.created_at))/86400)/365)::numeric w
  from public.reviews r where r.status='verified' and r.visit_verified
 ), platform as (
  select is_demo,sum(contact*w)/nullif(sum(w),0) c from approved group by is_demo
 ), common as (
  select s.id,s.is_demo,count(a.id) v,sum(a.contact*a.w)/nullif(sum(a.w),0) r,p.c
  from public.specialists s left join approved a on a.specialist_id=s.id left join platform p on p.is_demo=s.is_demo group by s.id,s.is_demo,p.c
 ), general as (
  select *,case when c is null then null else (v*coalesce(r,c)+10*c)/(v+10) end score from common
 ), weighted_cases as (
  select a.specialist_id,a.contact,a.w *
   case when p_age is null or p_group is null or p_group='unknown' or f.case_group='unknown' then 0 when p_group=f.case_group then 1 when p_group in ('autism','speech') and f.case_group in ('autism','speech') then 0.5 else 0 end *
   case when abs(p_age-f.age)<=2 then 1 when abs(p_age-f.age)<=4 then 0.5 else 0.2 end *
   case when p_format='any' or p_format=f.visit_format then 1 else 0.7 end w
  from approved a join private.review_case_features f on f.review_id=a.id
 ), comparable as (
  select specialist_id,sum(w) vs,sum(contact*w)/nullif(sum(w),0) rs,count(*) filter(where w>0) n from weighted_cases group by specialist_id
 )
 select g.id,round(g.score,2),round(case when coalesce(c.vs,0)>0 then (c.vs*c.rs+5*g.score)/(c.vs+5) else g.score end,2),g.v,coalesce(c.n,0),coalesce(c.vs,0),round(g.c,2)
 from general g left join comparable c on c.specialist_id=g.id
$$;
revoke all on function private.rating_values(numeric,text,text) from public,anon,authenticated;

create function private.ratings(p_child_id uuid,p_format text) returns jsonb language plpgsql stable security definer set search_path='' as $$declare age_value numeric;group_value text;begin
 if auth.uid() is null then raise exception 'Войдите в аккаунт';end if;
 if p_format not in ('offline','online','any') then raise exception 'Некорректный формат';end if;
 if p_child_id is not null then
  if private.care_role()<>'parent' then raise exception 'Нет доступа к ребёнку';end if;
  select private.rating_age(age),case_group into age_value,group_value from public.children where id=p_child_id and parent_id=auth.uid();
  if not found then raise exception 'Нет доступа к ребёнку';end if;
 end if;
 return (select coalesce(jsonb_agg(to_jsonb(v)),'[]') from private.rating_values(age_value,group_value,p_format) v);
end$$;
create function public.care_ratings(p_child_id uuid default null,p_format text default 'any') returns jsonb language sql stable security invoker set search_path='' as $$select private.ratings(p_child_id,p_format)$$;
revoke all on function private.ratings(uuid,text),public.care_ratings(uuid,text) from public,anon;
grant execute on function private.ratings(uuid,text),public.care_ratings(uuid,text) to authenticated;

create or replace function private.refresh_contact_rating() returns trigger language plpgsql security definer set search_path='' as $$begin
 update public.specialists s set verified_count=v.review_count,contact_rating=v.overall from private.rating_values(null,null,'any') v where s.id=v.specialist_id;
 return null;
end$$;
update public.specialists s set verified_count=v.review_count,contact_rating=v.overall from private.rating_values(null,null,'any') v where s.id=v.specialist_id;

create function private.book_slot(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;fmt text=coalesce(p->>'visit_format','offline');begin
 if auth.uid() is null or private.care_role()<>'parent' then raise exception 'Войдите как родитель';end if;
 if fmt not in ('offline','online') then raise exception 'Некорректный формат';end if;
 if fmt='online' and not exists(select 1 from public.schedule_slots sl join public.specialists s on s.id=sl.specialist_id where sl.id=(p->>'slot_id')::uuid and s.online) then raise exception 'Онлайн-формат недоступен';end if;
 result=private.care_command('book',p);
 update public.appointments set visit_format=fmt where id=(result->>'id')::uuid and parent_id=auth.uid();
 return result;
end$$;
create function private.submit_care_review(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;a public.appointments;rid uuid;group_value text;age_value numeric;begin
 if auth.uid() is null or private.care_role()<>'parent' then raise exception 'Войдите как родитель';end if;
 result=private.care_command('review',p);
 select * into a from public.appointments where id=(p->>'appointment_id')::uuid and parent_id=auth.uid();
 if coalesce((p->>'case_consent')::boolean,false) then
  select case_group,private.rating_age(age) into group_value,age_value from public.children where id=a.child_id and parent_id=auth.uid();
  select id into rid from public.reviews where appointment_id=a.id and parent_id=auth.uid();
  if group_value<>'unknown' and age_value is not null then insert into private.review_case_features(review_id,age,case_group,visit_format) values(rid,age_value,group_value,a.visit_format);end if;
 end if;
 return result;
end$$;
create function public.care_book_slot(p jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.book_slot(p)$$;
create function public.care_submit_review(p jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.submit_care_review(p)$$;
revoke all on function private.book_slot(jsonb),private.submit_care_review(jsonb),public.care_book_slot(jsonb),public.care_submit_review(jsonb) from public,anon;
grant execute on function private.book_slot(jsonb),private.submit_care_review(jsonb),public.care_book_slot(jsonb),public.care_submit_review(jsonb) to authenticated;

-- Preserve ownership checks and existing synthetic-profile validation.
do $$declare definition text;begin
 select pg_get_functiondef('public.save_synthetic_child(jsonb)'::regprocedure) into definition;
 definition=replace(definition,' insert into public.consent_records',
 ' if p_child ? ''case_group'' then
    if p_child->>''case_group'' not in (''unknown'',''speech'',''autism'',''learning'',''attention'',''other'') then raise exception ''Некорректная категория'';end if;
    update public.children set case_group=p_child->>''case_group'' where id=cid and parent_id=auth.uid();
   end if;
   insert into public.consent_records');
 execute definition;
end$$;


