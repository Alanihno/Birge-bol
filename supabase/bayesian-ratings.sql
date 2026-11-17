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
