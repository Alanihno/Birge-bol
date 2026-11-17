-- Birge Bol MVP. Synthetic data only until independent legal/privacy approval.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create table public.user_roles(user_id uuid primary key references auth.users(id) on delete cascade, role text not null check(role in ('parent','mentor','moderator','admin')), created_at timestamptz not null default now());
alter table public.user_roles enable row level security;
create policy own_role on public.user_roles for select to authenticated using(user_id=(select auth.uid()));
grant select on public.user_roles to authenticated;
revoke insert,update,delete on public.user_roles from anon,authenticated;
create function private.is_staff() returns boolean language sql stable security definer set search_path='' as $$ select auth.uid() is not null and exists(select 1 from public.user_roles where user_id=auth.uid() and role in ('admin','moderator')) $$;
revoke all on function private.is_staff() from public;
grant execute on function private.is_staff() to authenticated;

create table public.profiles(id uuid primary key references auth.users(id) on delete cascade, language text not null default 'ru' check(language in ('ru','kk')), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.children(id uuid primary key default gen_random_uuid(), parent_id uuid not null references auth.users(id) on delete cascade, label text not null default 'Профиль · демо' check(length(label)<=80), age text not null check(age in ('2–3','4–5','6–8','9–12')), city text not null default 'Астана' check(length(city)<=60), district text not null check(length(district)<=60), concerns text[] not null default '{}' check(concerns <@ array['speech','communication','behavior','learning','attention','writing','other']::text[]), experience text not null check(experience in ('first','visited','conclusion')), budget integer not null check(budget between 0 and 1000000), format text not null check(format in ('any','online','offline')), created_at timestamptz not null default now(),updated_at timestamptz not null default now(), unique(id,parent_id));
create table public.consent_records(id uuid primary key default gen_random_uuid(),parent_id uuid not null references auth.users(id) on delete cascade,purpose text not null check(purpose in ('synthetic_profile','question','review','telegram')),version text not null default 'mvp-1',granted boolean not null default true,created_at timestamptz not null default now());
create table public.cities(id uuid primary key default gen_random_uuid(),name text not null unique);
create table public.districts(id uuid primary key default gen_random_uuid(),city_id uuid not null references public.cities(id),name text not null,unique(city_id,name));
create table public.specializations(id uuid primary key default gen_random_uuid(),name text not null unique);
create table public.specialists(id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 2 and 100),specialty text not null,city text not null,district text not null,price integer not null check(price>=0),experience integer not null check(experience between 0 and 70),online boolean not null default false,concerns text[] not null default '{}',ages text[] not null default '{}',description text not null check(length(description)<=3000),color text not null default 'lilac' check(color in ('lilac','peach','sage','butter')),published boolean not null default false,is_demo boolean not null default true,contact_url text check(contact_url is null or contact_url ~ '^https://[^/@[:space:]]+'),contact_consent boolean not null default false,latitude double precision check(latitude between -90 and 90),longitude double precision check(longitude between -180 and 180),address text,verified_count integer not null default 0 check(verified_count>=0),contact_rating numeric check(contact_rating between 1 and 5),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(contact_url is null or contact_consent),check((latitude is null)=(longitude is null)));
create table public.specialist_services(id uuid primary key default gen_random_uuid(),specialist_id uuid not null references public.specialists(id) on delete cascade,title text not null,price integer not null check(price>=0),age_ranges text[] not null default '{}',stages text[] not null default '{}');
create table public.medical_terms(id uuid primary key default gen_random_uuid(),term text not null unique,title text not null,meaning text not null check(length(meaning)<=3000),questions text[] not null default '{}',approved boolean not null default false,is_demo boolean not null default true,version integer not null default 1,updated_at timestamptz not null default now());
create table public.recommendation_rules(id uuid primary key default gen_random_uuid(),version text not null,title text not null,conditions jsonb not null default '{}',explanation text not null,approved boolean not null default false,enabled boolean not null default false,created_at timestamptz not null default now());
create table public.favorites(parent_id uuid not null references auth.users(id) on delete cascade,specialist_id uuid not null references public.specialists(id) on delete cascade,created_at timestamptz not null default now(),primary key(parent_id,specialist_id));
create table public.appointments(id uuid primary key default gen_random_uuid(),parent_id uuid not null references auth.users(id) on delete cascade,child_id uuid not null,specialist_id uuid not null references public.specialists(id),starts_at timestamptz not null,status text not null default 'self_reported' check(status in ('self_reported','cancelled')),created_at timestamptz not null default now(),foreign key(child_id,parent_id) references public.children(id,parent_id) on delete cascade);
create table public.waitlist(id uuid primary key default gen_random_uuid(),parent_id uuid not null references auth.users(id) on delete cascade,specialist_id uuid not null references public.specialists(id),consent boolean not null check(consent),created_at timestamptz not null default now(),unique(parent_id,specialist_id));
create table public.session_feedback(id uuid primary key default gen_random_uuid(),parent_id uuid not null references auth.users(id) on delete cascade,child_id uuid not null,specialist_id uuid not null references public.specialists(id),contact integer not null check(contact between 1 and 5),adaptation text not null check(adaptation in ('yes','partial','no')),explained boolean not null,goal boolean not null,comfortable boolean not null,created_at timestamptz not null default now(),foreign key(child_id,parent_id) references public.children(id,parent_id) on delete cascade);
create table public.reviews(id uuid primary key default gen_random_uuid(),parent_id uuid not null references auth.users(id) on delete cascade,specialist_id uuid not null references public.specialists(id),feedback_id uuid references public.session_feedback(id) on delete set null,body text not null check(length(body) between 10 and 2000),contact integer not null check(contact between 1 and 5),status text not null default 'pending' check(status in ('draft','pending','verified','rejected')),evidence text,is_demo boolean not null default false,created_at timestamptz not null default now(),check(status<>'verified' or (evidence is not null and length(evidence)>10 and not is_demo)));
create table public.review_reports(id uuid primary key default gen_random_uuid(),parent_id uuid not null references auth.users(id) on delete cascade,review_id uuid not null references public.reviews(id) on delete cascade,reason text not null check(length(reason) between 5 and 500),created_at timestamptz not null default now(),unique(parent_id,review_id));
create table public.mentors(id uuid primary key references auth.users(id) on delete cascade,alias text not null,opted_in boolean not null default false,approved boolean not null default false);
create table public.questions(id uuid primary key default gen_random_uuid(),parent_id uuid references auth.users(id) on delete cascade,title text not null check(length(title) between 8 and 120),body text not null check(length(body) between 20 and 1200),topic text not null check(topic in ('Речь','Занятия','ПМПК','Поддержка')),city text not null default 'Астана',status text not null default 'pending_moderation' check(status in ('draft','pending_moderation','open','answered','closed')),is_demo boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.answers(id uuid primary key default gen_random_uuid(),question_id uuid not null references public.questions(id) on delete cascade,mentor_id uuid references public.mentors(id),body text not null check(length(body) between 10 and 2000),approved boolean not null default false,is_demo boolean not null default false,created_at timestamptz not null default now());
create table public.child_goals(id uuid primary key default gen_random_uuid(),parent_id uuid not null references auth.users(id) on delete cascade,child_id uuid not null,title text not null check(length(title) between 5 and 180),metric text not null check(length(metric)<=100),target integer not null check(target between 1 and 1000),due_at date not null,status text not null default 'active' check(status in ('active','completed','paused')),created_at timestamptz not null default now(),foreign key(child_id,parent_id) references public.children(id,parent_id) on delete cascade,unique(id,parent_id));
create table public.progress_entries(id uuid primary key default gen_random_uuid(),parent_id uuid not null references auth.users(id) on delete cascade,goal_id uuid not null,value integer not null check(value between 0 and 1000),note text not null default '' check(length(note)<=500),created_at timestamptz not null default now(),foreign key(goal_id,parent_id) references public.child_goals(id,parent_id) on delete cascade);
create table public.notifications(id uuid primary key default gen_random_uuid(),parent_id uuid not null references auth.users(id) on delete cascade,title text not null check(length(title)<=240),read boolean not null default false,"to" text not null check("to" ~ '^/[^/]'),created_at timestamptz not null default now());
create table public.audit_logs(id uuid primary key default gen_random_uuid(),actor_id uuid references auth.users(id) on delete set null,entity text not null,entity_id text,action text not null,created_at timestamptz not null default now());
create table private.rate_limits(user_id uuid not null references auth.users(id) on delete cascade,bucket text not null,window_start timestamptz not null,hits integer not null default 1,primary key(user_id,bucket,window_start));
alter table private.rate_limits enable row level security;
create table private.telegram_events(update_id bigint primary key,created_at timestamptz not null default now());
alter table private.telegram_events enable row level security;

-- Personal rows: ownership for both existing and resulting rows. Composite FKs prevent cross-family references.
do $$ declare tbl text; begin foreach tbl in array array['children','consent_records','favorites','appointments','waitlist','session_feedback','review_reports','child_goals','progress_entries'] loop
 execute format('alter table public.%I enable row level security',tbl);
 execute format('create policy owner_select on public.%I for select to authenticated using(parent_id=(select auth.uid()))',tbl);
 execute format('create policy owner_insert on public.%I for insert to authenticated with check(parent_id=(select auth.uid()))',tbl);
 execute format('create policy owner_delete on public.%I for delete to authenticated using(parent_id=(select auth.uid()))',tbl);
 execute format('grant select,insert,delete on public.%I to authenticated',tbl);
 execute format('create index on public.%I(parent_id)',tbl);
 end loop; end $$;
create policy owner_update on public.children for update to authenticated using(parent_id=(select auth.uid())) with check(parent_id=(select auth.uid()));
grant update(label,age,city,district,concerns,experience,budget,format) on public.children to authenticated;
create policy goal_update on public.child_goals for update to authenticated using(parent_id=(select auth.uid())) with check(parent_id=(select auth.uid()));
grant update(title,metric,target,due_at,status) on public.child_goals to authenticated;
-- Upsert requires parent_id/id in UPDATE privilege; immutable ownership is still checked by RLS and trigger below.
grant update(id,parent_id) on public.children,public.child_goals to authenticated;
create policy favorite_update on public.favorites for update to authenticated using(parent_id=(select auth.uid())) with check(parent_id=(select auth.uid()));
grant update on public.favorites to authenticated;
alter table public.profiles enable row level security;
create policy own_profile on public.profiles for all to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
grant select,insert,delete on public.profiles to authenticated;
grant update(language) on public.profiles to authenticated;
alter table public.notifications enable row level security;
create policy own_notifications on public.notifications for select to authenticated using(parent_id=(select auth.uid()));
create policy read_notifications on public.notifications for update to authenticated using(parent_id=(select auth.uid())) with check(parent_id=(select auth.uid()));
grant select on public.notifications to authenticated;
grant update(read) on public.notifications to authenticated;

do $$ declare tbl text; begin foreach tbl in array array['cities','districts','specializations'] loop
 execute format('alter table public.%I enable row level security',tbl);
 execute format('create policy public_read on public.%I for select to anon,authenticated using(true)',tbl);
 execute format('grant select on public.%I to anon,authenticated',tbl);
 end loop; end $$;
alter table public.specialists enable row level security;
create policy published_specialists on public.specialists for select to anon,authenticated using(published);
create policy staff_specialists on public.specialists for all to authenticated using((select private.is_staff())) with check((select private.is_staff()));
grant select on public.specialists to anon,authenticated;
grant insert,update,delete on public.specialists to authenticated;
alter table public.specialist_services enable row level security;
create policy published_services on public.specialist_services for select to anon,authenticated using(exists(select 1 from public.specialists s where s.id=specialist_id and s.published));
grant select on public.specialist_services to anon,authenticated;
alter table public.medical_terms enable row level security;
create policy readable_terms on public.medical_terms for select to anon,authenticated using(approved or is_demo);
create policy staff_terms on public.medical_terms for all to authenticated using((select private.is_staff())) with check((select private.is_staff()));
grant select on public.medical_terms to anon,authenticated;
grant insert,update,delete on public.medical_terms to authenticated;
alter table public.recommendation_rules enable row level security;
create policy readable_rules on public.recommendation_rules for select to anon,authenticated using(approved and enabled);
create policy staff_rules on public.recommendation_rules for all to authenticated using((select private.is_staff())) with check((select private.is_staff()));
grant select on public.recommendation_rules to anon,authenticated;
grant insert,update,delete on public.recommendation_rules to authenticated;
alter table public.reviews enable row level security;
create policy public_reviews on public.reviews for select to anon,authenticated using(status='verified' and evidence is not null and not is_demo);
create policy own_reviews on public.reviews for select to authenticated using(parent_id=(select auth.uid()));
create policy submit_review on public.reviews for insert to authenticated with check(parent_id=(select auth.uid()) and status in ('draft','pending') and evidence is null and (feedback_id is null or exists(select 1 from public.session_feedback f where f.id=feedback_id and f.parent_id=(select auth.uid()) and f.specialist_id=reviews.specialist_id)));
create policy delete_own_review on public.reviews for delete to authenticated using(parent_id=(select auth.uid()));
create policy moderate_review on public.reviews for all to authenticated using((select private.is_staff())) with check((select private.is_staff()));
grant select on public.reviews to anon,authenticated;
grant insert,delete,update on public.reviews to authenticated;
alter table public.questions enable row level security;
create policy public_questions on public.questions for select to anon,authenticated using(status in ('open','answered'));
create policy own_questions on public.questions for select to authenticated using(parent_id=(select auth.uid()));
create policy submit_questions on public.questions for insert to authenticated with check(parent_id=(select auth.uid()) and status in ('draft','pending_moderation') and not is_demo);
create policy remove_own_question on public.questions for delete to authenticated using(parent_id=(select auth.uid()));
create policy staff_questions on public.questions for all to authenticated using((select private.is_staff())) with check((select private.is_staff()));
grant select on public.questions to anon,authenticated;
grant insert,update,delete on public.questions to authenticated;
alter table public.answers enable row level security;
create policy readable_answers on public.answers for select to anon,authenticated using(approved and exists(select 1 from public.questions q where q.id=question_id and q.status in ('open','answered')));
create policy staff_answers on public.answers for all to authenticated using((select private.is_staff())) with check((select private.is_staff()));
grant select on public.answers to anon,authenticated;
grant insert,update,delete on public.answers to authenticated;
alter table public.mentors enable row level security;
create policy staff_mentors on public.mentors for all to authenticated using((select private.is_staff())) with check((select private.is_staff()));
grant select,insert,update,delete on public.mentors to authenticated;
alter table public.audit_logs enable row level security;
create policy staff_audit on public.audit_logs for select to authenticated using((select private.is_staff()));
grant select on public.audit_logs to authenticated;

create index specialists_filter on public.specialists(city,district,specialty,price) where published;
create index specialists_concerns on public.specialists using gin(concerns);
create index questions_status on public.questions(status,created_at desc);
create index questions_owner on public.questions(parent_id);
create index answers_question on public.answers(question_id);
create index reviews_specialist on public.reviews(specialist_id,status);
create index reviews_owner on public.reviews(parent_id);
create index goals_child on public.child_goals(child_id);
create index entries_goal on public.progress_entries(goal_id,created_at);
create index notification_owner on public.notifications(parent_id,read);
create index service_specialist on public.specialist_services(specialist_id);
create index feedback_specialist on public.session_feedback(specialist_id);

create function private.touch_and_protect_owner() returns trigger language plpgsql set search_path='' as $$ begin
 if new.id<>old.id or new.parent_id<>old.parent_id then raise exception 'immutable ownership'; end if;
 if tg_table_name='children' then new.updated_at=now(); end if;return new;end $$;
create trigger protect_child before update on public.children for each row execute function private.touch_and_protect_owner();
create trigger protect_goal before update on public.child_goals for each row execute function private.touch_and_protect_owner();
create function private.limit_submissions() returns trigger language plpgsql set search_path='' as $$ declare n integer;begin
 if auth.uid() is null then return new;end if;
 new.created_at=now();perform pg_advisory_xact_lock(hashtext(auth.uid()::text||tg_table_name));
 execute format('select count(*) from public.%I where parent_id=$1 and created_at>now()-interval ''1 hour''',tg_table_name) into n using auth.uid();
 if n>=10 then raise exception 'rate limit: 10 submissions per hour';end if;return new;end $$;
create trigger limit_questions before insert on public.questions for each row execute function private.limit_submissions();
create trigger limit_reviews before insert on public.reviews for each row execute function private.limit_submissions();
create function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is not null then insert into public.audit_logs(actor_id,entity,entity_id,action) values(auth.uid(),tg_table_name,coalesce(new.id,old.id)::text,tg_op);end if;
 return coalesce(new,old);end $$;
revoke all on function private.audit_change() from public,anon,authenticated;
create trigger audit_specialists after insert or update or delete on public.specialists for each row execute function private.audit_change();
create trigger audit_reviews after update on public.reviews for each row execute function private.audit_change();
create trigger audit_terms after update on public.medical_terms for each row execute function private.audit_change();

create function public.submit_feedback(p_child_id uuid,p_specialist_id uuid,p_answers jsonb,p_review text default null) returns uuid language plpgsql security invoker set search_path='' as $$ declare fid uuid;begin
 if auth.uid() is null then raise exception 'authentication required';end if;
 if not exists(select 1 from public.children where id=p_child_id and parent_id=auth.uid()) then raise exception 'child not found';end if;
 insert into public.session_feedback(parent_id,child_id,specialist_id,contact,adaptation,explained,goal,comfortable) values(auth.uid(),p_child_id,p_specialist_id,(p_answers->>'contact')::integer,p_answers->>'adaptation',(p_answers->>'explained')::boolean,(p_answers->>'goal')::boolean,(p_answers->>'comfortable')::boolean) returning id into fid;
 if p_review is not null then insert into public.reviews(parent_id,specialist_id,feedback_id,body,contact,status) values(auth.uid(),p_specialist_id,fid,p_review,(p_answers->>'contact')::integer,'pending');end if;return fid;end $$;
revoke all on function public.submit_feedback(uuid,uuid,jsonb,text) from public,anon;
grant execute on function public.submit_feedback(uuid,uuid,jsonb,text) to authenticated;
create function public.consume_function_quota(p_bucket text) returns boolean language plpgsql security definer set search_path='' as $$ declare hits integer;begin
 if auth.uid() is null or p_bucket not in ('explain','telegram') then raise exception 'invalid authenticated quota request';end if;
 insert into private.rate_limits(user_id,bucket,window_start) values(auth.uid(),p_bucket,date_trunc('hour',now())) on conflict(user_id,bucket,window_start) do update set hits=private.rate_limits.hits+1 returning rate_limits.hits into hits;
 return hits<=10;end $$;
revoke all on function public.consume_function_quota(text) from public,anon;
grant execute on function public.consume_function_quota(text) to authenticated;
-- SECURITY DEFINER quota endpoint has no arbitrary user_id or schema access; identity always auth.uid().
-- No public Storage bucket is created. Real child media upload is deliberately unavailable.
