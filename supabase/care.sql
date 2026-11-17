-- Additive migration for the existing Birge Bol database. All seed content is synthetic.
create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;
alter table public.user_roles drop constraint user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check check(role in ('parent','specialist','clinic','mentor','moderator','admin'));
alter table public.specialists add column owner_id uuid unique references auth.users(id);
alter table public.specialists add column verification_status text not null default 'pending' check(verification_status in ('pending','approved','rejected'));
alter table public.specialists add column profile jsonb not null default '{}';
alter table public.profiles add column contact text not null default '';
alter table public.child_goals add column specialist_id uuid references public.specialists(id);
alter table public.child_goals add column stage integer not null default 1 check(stage between 1 and 4);
alter table public.children add column diagnosis text not null default '';

create table public.clinics(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),name text not null,district text not null,address text not null default '',description text not null default '',services text not null default '',contacts text not null default '',status text not null default 'pending' check(status in ('pending','approved','rejected')),is_demo boolean not null default false);
create table public.clinic_members(clinic_id uuid references public.clinics(id) on delete cascade,specialist_id uuid references public.specialists(id) on delete cascade,status text not null default 'active' check(status in ('active','removed')),primary key(clinic_id,specialist_id));
create table public.clinic_branches(id uuid primary key default gen_random_uuid(),clinic_id uuid not null references public.clinics(id) on delete cascade,name text not null,district text not null,address text not null);
create table public.clinic_invitations(id uuid primary key default gen_random_uuid(),clinic_id uuid not null references public.clinics(id) on delete cascade,email text not null,status text not null default 'pending' check(status in ('pending','accepted','declined')),unique(clinic_id,email));
create table public.schedule_slots(id uuid primary key default gen_random_uuid(),specialist_id uuid not null references public.specialists(id),starts_at timestamptz not null,ends_at timestamptz not null,service text not null default 'Консультация',price integer not null check(price>=0),available boolean not null default true,check(ends_at>starts_at and ends_at<=starts_at+interval '8 hours'),exclude using gist(specialist_id with =,tstzrange(starts_at,ends_at,'[)') with &&));
alter table public.appointments drop constraint appointments_status_check;
alter table public.appointments add constraint appointments_status_check check(status in ('self_reported','pending','confirmed','rescheduled','cancelled','attended','completed'));
alter table public.appointments add column slot_id uuid references public.schedule_slots(id);
alter table public.appointments add column ends_at timestamptz;
alter table public.appointments add column service text not null default 'Консультация';
alter table public.appointments add column reason text not null default '' check(length(reason)<=1000);
alter table public.appointments add column contact text not null default '' check(length(contact)<=250);
alter table public.appointments add column share_diary boolean not null default false;
alter table public.appointments add column diagnosis text not null default '';
alter table public.appointments add column visit_verified boolean not null default false;
alter table public.appointments add column is_demo boolean not null default false;
alter table public.appointments add column clinic_id uuid references public.clinics(id);
alter table public.appointments add column proposed_slot_id uuid references public.schedule_slots(id);
alter table public.appointments add constraint appointment_no_overlap exclude using gist(specialist_id with =,tstzrange(starts_at,ends_at,'[)') with &&) where(status in ('pending','confirmed','rescheduled','attended','completed') and slot_id is not null);
alter table public.appointments add constraint child_no_overlap exclude using gist(child_id with =,tstzrange(starts_at,ends_at,'[)') with &&) where(status in ('pending','confirmed','rescheduled','attended','completed') and slot_id is not null);
create table private.attendance_tokens(appointment_id uuid primary key references public.appointments(id) on delete cascade,code_hash text not null,expires_at timestamptz not null,used_at timestamptz,attempts integer not null default 0);
alter table private.attendance_tokens enable row level security;
revoke all on private.attendance_tokens from public,anon,authenticated;
alter table public.reviews add column appointment_id uuid unique references public.appointments(id);
alter table public.reviews add column strengths text[] not null default '{}';
alter table public.reviews add column visit_verified boolean not null default false;
-- Replace only the old verification check, retaining all data and other validations.
do $$ declare c record; begin for c in select conname from pg_constraint where conrelid='public.reviews'::regclass and contype='c' and pg_get_constraintdef(oid) like '%evidence%' loop execute format('alter table public.reviews drop constraint %I',c.conname);end loop;end $$;
alter table public.reviews add constraint evidence_for_verified check(status<>'verified' or (visit_verified and appointment_id is not null and evidence is not null));
create table public.task_materials(id uuid primary key default gen_random_uuid(),author_id uuid not null references auth.users(id),title text not null check(length(title) between 3 and 160),goal text not null,duration integer not null default 5 check(duration between 1 and 180),items text[] not null default '{}',steps text[] not null default '{}',signs text not null default '',stop text not null default '',video_url text,memo_url text,captions_ru text,captions_kk text,status text not null default 'pending' check(status in ('pending','approved','rejected')),rights_confirmed boolean not null default false,is_demo boolean not null default false);
create table public.task_assignments(id uuid primary key default gen_random_uuid(),parent_id uuid not null references auth.users(id),child_id uuid not null,specialist_id uuid not null references public.specialists(id),material_id uuid not null references public.task_materials(id),goal_id uuid references public.child_goals(id),goal_title text not null default '',duration integer not null check(duration between 1 and 180),frequency text not null,due_at date not null,comment text not null default '',status text not null default 'new' check(status in ('new','active','done','difficult','cancelled')),created_at timestamptz not null default now(),foreign key(child_id,parent_id) references public.children(id,parent_id) on delete cascade);
create table public.task_completions(id uuid primary key default gen_random_uuid(),assignment_id uuid not null references public.task_assignments(id) on delete cascade,child_id uuid not null references public.children(id) on delete cascade,parent_id uuid not null references auth.users(id),specialist_id uuid not null references public.specialists(id),outcome text not null check(outcome in ('good','partial','difficult')),comment text not null default '' check(length(comment)<=1000),created_at timestamptz not null default now());
create unique index task_once_daily on public.task_completions(assignment_id,((created_at at time zone 'Asia/Almaty')::date));
create table public.care_messages(id uuid primary key default gen_random_uuid(),appointment_id uuid not null references public.appointments(id) on delete cascade,sender_id uuid not null references auth.users(id),body text not null check(length(body) between 1 and 2000),created_at timestamptz not null default now());
create table public.family_task_links(id uuid primary key default gen_random_uuid(),parent_id uuid not null references auth.users(id),assignment_id uuid not null references public.task_assignments(id) on delete cascade,token_hash text not null unique,expires_at timestamptz not null,revoked boolean not null default false);
create table public.care_reminders(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),title text not null,"to" text not null,due_at timestamptz not null,delivered boolean not null default false);
create table public.qualification_documents(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),title text not null,document_url text not null,status text not null default 'pending' check(status in ('pending','approved','rejected')));

create or replace function private.care_role() returns text language sql stable security definer set search_path='' as $$select role from public.user_roles where user_id=auth.uid()$$;
create or replace function private.demo_actor() returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and coalesce((select (raw_app_meta_data->>'is_demo')::boolean from auth.users where id=auth.uid()),false)$$;
create function private.owns_specialist(sid uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.specialists where id=sid and owner_id=auth.uid())$$;
create function private.has_patient(cid uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.appointments a join public.specialists s on s.id=a.specialist_id where a.child_id=cid and s.owner_id=auth.uid() and a.share_diary and a.status in ('confirmed','attended','completed'))$$;
create function private.clinic_owns(cid uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.clinics where id=cid and owner_id=auth.uid())$$;
create function private.in_my_clinic(sid uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.clinic_members m join public.clinics c on c.id=m.clinic_id where m.specialist_id=sid and m.status='active' and c.owner_id=auth.uid())$$;
revoke all on function private.care_role(),private.demo_actor(),private.owns_specialist(uuid),private.has_patient(uuid),private.clinic_owns(uuid),private.in_my_clinic(uuid) from public,anon;
grant execute on function private.care_role(),private.demo_actor(),private.owns_specialist(uuid),private.has_patient(uuid),private.clinic_owns(uuid),private.in_my_clinic(uuid) to authenticated;

do $$ declare t text; begin foreach t in array array['clinics','clinic_members','clinic_branches','clinic_invitations','schedule_slots','task_materials','task_assignments','task_completions','care_messages','family_task_links','care_reminders','qualification_documents'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;end $$;
create policy clinic_read on public.clinics for select to authenticated using(status='approved' or owner_id=(select auth.uid()) or (select private.is_staff()));
create policy member_read on public.clinic_members for select to authenticated using(status='active' or private.clinic_owns(clinic_id) or private.owns_specialist(specialist_id));
create policy branch_read on public.clinic_branches for select to authenticated using(exists(select 1 from public.clinics c where c.id=clinic_id));
create policy invitation_read on public.clinic_invitations for select to authenticated using(private.clinic_owns(clinic_id) or lower(email)=lower((select auth.jwt()->>'email')));
create policy slot_read on public.schedule_slots for select to authenticated using(exists(select 1 from public.specialists s where s.id=specialist_id and (s.published or s.owner_id=(select auth.uid()))) or private.in_my_clinic(specialist_id));
create policy own_specialist on public.specialists for select to authenticated using(owner_id=(select auth.uid()));
create policy task_read on public.task_materials for select to authenticated using(author_id=(select auth.uid()) or (select private.is_staff()) or (status='approved' and (not is_demo or (select private.demo_actor())) and (private.care_role()='specialist' or exists(select 1 from public.task_assignments a where a.material_id=id and a.parent_id=(select auth.uid())))));
create policy assignments_read on public.task_assignments for select to authenticated using(parent_id=(select auth.uid()) or (private.owns_specialist(specialist_id) and private.has_patient(child_id)));
create policy completions_read on public.task_completions for select to authenticated using(parent_id=(select auth.uid()) or (private.owns_specialist(specialist_id) and private.has_patient(child_id)));
create policy message_read on public.care_messages for select to authenticated using(exists(select 1 from public.appointments a where a.id=appointment_id and (a.parent_id=(select auth.uid()) or private.owns_specialist(a.specialist_id))));
create policy links_read on public.family_task_links for select to authenticated using(parent_id=(select auth.uid()));
create policy reminders_read on public.care_reminders for select to authenticated using(user_id=(select auth.uid()));
create policy documents_read on public.qualification_documents for select to authenticated using(owner_id=(select auth.uid()) or (select private.is_staff()));
-- Business writes go through checked transactions. Closing legacy bypasses is essential.
revoke insert,update,delete on public.appointments,public.session_feedback from authenticated;
revoke insert,update on public.reviews from authenticated;
revoke execute on function public.submit_feedback(uuid,uuid,jsonb,text) from authenticated;
revoke select on public.appointments from anon;
-- Specialist/clinic access to clinical tables is always consent-scoped; clinics have no policy here.
-- Children are shared using an explicit projection below, never unrestricted clinical rows.
create policy specialist_goals on public.child_goals for select to authenticated using(private.has_patient(child_id));
create policy specialist_progress on public.progress_entries for select to authenticated using(exists(select 1 from public.child_goals g where g.id=goal_id and private.has_patient(g.child_id)));
-- Provider appointment projection hides diagnosis until confirmation and consent.
-- Clinics use the safe projection in care_snapshot, never the full appointment table.

create function private.care_notice(uid uuid,title text,path text) returns void language sql set search_path='' as $$insert into public.notifications(parent_id,title,"to") values(uid,title,path)$$;
revoke all on function private.care_notice(uuid,text,text) from public,anon,authenticated;

create function private.register_care_role(p_role text) returns text language plpgsql security definer set search_path='' as $$declare existing text;sid uuid;begin
 if auth.uid() is null then raise exception 'Войдите в аккаунт';end if;
 select role into existing from public.user_roles where user_id=auth.uid();
 if existing is not null then return existing;end if;
 if p_role not in ('parent','specialist','clinic') then raise exception 'Недопустимая роль';end if;
 insert into public.user_roles(user_id,role) values(auth.uid(),p_role);
 insert into public.profiles(id) values(auth.uid()) on conflict do nothing;
 if p_role='specialist' then insert into public.specialists(owner_id,name,specialty,city,district,price,experience,description,is_demo) values(auth.uid(),'Новый специалист','Логопед','Алматы','Бостандыкский',0,0,'Профиль на модерации',private.demo_actor());end if;
 if p_role='clinic' then insert into public.clinics(owner_id,name,district,is_demo) values(auth.uid(),'Новая клиника','Бостандыкский',private.demo_actor());end if;
 return p_role;
end$$;
create function public.register_care_role(p_role text) returns text language sql security invoker set search_path='' as $$select private.register_care_role(p_role)$$;
revoke all on function private.register_care_role(text),public.register_care_role(text) from public,anon;
grant execute on function private.register_care_role(text),public.register_care_role(text) to authenticated;

create function private.care_command(p_action text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid=auth.uid();sid uuid;cid uuid;oid uuid;aid uuid;target uuid;code text;tok text;a public.appointments;sl public.schedule_slots;asgn public.task_assignments;mat public.task_materials;rol text;dem boolean;expiry timestamptz;feedback_id uuid;result jsonb='{}';
begin
 if uid is null then raise exception 'Войдите в аккаунт';end if;
 rol=private.care_role();dem=private.demo_actor();
 if length(p::text)>24000 then raise exception 'Слишком большой запрос';end if;
 select id into sid from public.specialists where owner_id=uid;
 select id into cid from public.clinics where owner_id=uid order by id limit 1;
 if p_action='book' then
  if rol is distinct from 'parent' then raise exception 'Запись доступна родителю';end if;
  select * into sl from public.schedule_slots where id=(p->>'slot_id')::uuid for update;
  if sl.id is null or not sl.available or sl.starts_at<=now() then raise exception 'Окно недоступно';end if;
  if not exists(select 1 from public.children where id=(p->>'child_id')::uuid and parent_id=uid) then raise exception 'Нет доступа к ребёнку';end if;
  if not exists(select 1 from public.specialists where id=sl.specialist_id and published and verification_status='approved' and (not is_demo or dem)) then raise exception 'Специалист недоступен';end if;
  perform pg_advisory_xact_lock(hashtextextended(sl.specialist_id::text,0));
  insert into public.appointments(parent_id,child_id,specialist_id,slot_id,starts_at,ends_at,status,service,reason,contact,share_diary,diagnosis,is_demo,clinic_id)
   values(uid,(p->>'child_id')::uuid,sl.specialist_id,sl.id,sl.starts_at,sl.ends_at,'pending',sl.service,coalesce(p->>'reason',''),coalesce(p->>'contact',''),coalesce((p->>'share_diary')::boolean,false),case when (p->>'share_diagnosis')::boolean then coalesce(p->>'diagnosis','') else '' end,dem,(select clinic_id from public.clinic_members where specialist_id=sl.specialist_id and status='active' limit 1)) returning id into aid;
  update public.schedule_slots set available=false where id=sl.id;
  perform private.care_notice((select owner_id from public.specialists where id=sl.specialist_id),'Новая заявка на приём','/pro/requests');
  result=jsonb_build_object('id',aid);
 elsif p_action in ('confirm','cancel','propose','accept_time','issue_code','redeem_code','review','message','consent') then
  select * into a from public.appointments where id=(p->>'appointment_id')::uuid for update;
  if a.id is null or not coalesce(a.parent_id=uid or a.specialist_id=sid or (a.clinic_id=cid and cid is not null),false) then raise exception 'Нет доступа к записи';end if;
  if p_action='confirm' then
   if not coalesce(a.specialist_id=sid or a.clinic_id=cid,false) or a.status<>'pending' then raise exception 'Нельзя подтвердить';end if;
   update public.appointments set status='confirmed' where id=a.id;
   perform private.care_notice(a.parent_id,'Запись подтверждена. Возьмите вопросы, воду и привычную игрушку; список документов уточните у специалиста.','/diary');
  elsif p_action='cancel' then
   if a.status not in ('pending','confirmed','rescheduled') then raise exception 'Запись уже завершена';end if;
   update public.appointments set status='cancelled',proposed_slot_id=null where id=a.id;
   update public.schedule_slots set available=true where id in (a.slot_id,a.proposed_slot_id);
   perform private.care_notice(case when uid=a.parent_id then (select owner_id from public.specialists where id=a.specialist_id) else a.parent_id end,'Приём отменён','/diary');
   insert into public.notifications(parent_id,title,"to") select w.parent_id,'Освободилось место у специалиста','/specialists/'||a.specialist_id from public.waitlist w where w.specialist_id=a.specialist_id and w.consent;
  elsif p_action='propose' then
   if not coalesce(a.specialist_id=sid or a.clinic_id=cid,false) or a.status not in ('pending','confirmed','rescheduled') then raise exception 'Нельзя перенести';end if;
   select * into sl from public.schedule_slots where id=(p->>'slot_id')::uuid for update;
   if sl.id is null or sl.specialist_id is distinct from a.specialist_id or not sl.available or sl.starts_at<=now() then raise exception 'Окно недоступно';end if;
   update public.schedule_slots set available=true where id=a.proposed_slot_id;
   update public.schedule_slots set available=false where id=sl.id;
   update public.appointments set proposed_slot_id=sl.id,status='rescheduled' where id=a.id;
   perform private.care_notice(a.parent_id,'Специалист предложил другое время. Подтвердите перенос.','/diary');
  elsif p_action='accept_time' then
   if uid<>a.parent_id or a.status<>'rescheduled' or a.proposed_slot_id is null then raise exception 'Перенос не предложен';end if;
   select * into sl from public.schedule_slots where id=a.proposed_slot_id for update;
   update public.schedule_slots set available=true where id=a.slot_id;
   update public.appointments set slot_id=sl.id,starts_at=sl.starts_at,ends_at=sl.ends_at,proposed_slot_id=null,status='confirmed' where id=a.id;
   perform private.care_notice((select owner_id from public.specialists where id=a.specialist_id),'Родитель подтвердил новое время','/pro');
  elsif p_action='issue_code' then
   if a.specialist_id is distinct from sid or a.status<>'confirmed' or (a.starts_at>now() and not (a.is_demo and dem)) then raise exception 'Сначала должен состояться приём';end if;
   tok=encode(extensions.gen_random_bytes(6),'hex');
   code=lpad(((('x'||substr(tok,1,6))::bit(24)::int)%1000000)::text,6,'0');
   insert into private.attendance_tokens(appointment_id,code_hash,expires_at) values(a.id,encode(extensions.digest(a.id::text||':'||code,'sha256'),'hex'),now()+interval '30 minutes');
   update public.appointments set status='attended' where id=a.id;
   perform private.care_notice(a.parent_id,'Подтвердите посещение одноразовым кодом специалиста','/diary');
   result=jsonb_build_object('code',code,'expires_at',now()+interval '30 minutes');
  elsif p_action='redeem_code' then
   if a.parent_id<>uid or a.status<>'attended' then raise exception 'Подтверждение недоступно';end if;
   if not exists(select 1 from private.attendance_tokens where appointment_id=a.id and used_at is null and expires_at>now() and attempts<10) then raise exception 'Код истёк или использован';end if;
   update private.attendance_tokens set attempts=attempts+1 where appointment_id=a.id;
   if not exists(select 1 from private.attendance_tokens where appointment_id=a.id and code_hash=encode(extensions.digest(a.id::text||':'||(p->>'code'),'sha256'),'hex')) then return jsonb_build_object('error','Неверный код');end if;
   update private.attendance_tokens set used_at=now() where appointment_id=a.id;
   update public.appointments set visit_verified=true,status='completed' where id=a.id;
   perform private.care_notice(uid,'Посещение подтверждено. Теперь можно оставить отзыв.','/feedback/'||a.id);
  elsif p_action='review' then
   if a.parent_id<>uid or not a.visit_verified or a.status<>'completed' then raise exception 'Сначала подтвердите посещение';end if;
   insert into public.session_feedback(parent_id,child_id,specialist_id,contact,adaptation,explained,goal,comfortable) values(uid,a.child_id,a.specialist_id,(p->>'contact')::integer,coalesce(p->>'adaptation','yes'),coalesce((p->>'explained')::boolean,false),coalesce((p->>'goal')::boolean,false),coalesce((p->>'comfortable')::boolean,false)) returning id into feedback_id;
   insert into public.reviews(parent_id,specialist_id,appointment_id,feedback_id,body,contact,status,evidence,is_demo,visit_verified,strengths) values(uid,a.specialist_id,a.id,feedback_id,p->>'body',(p->>'contact')::integer,'pending','one-time attendance code',a.is_demo,true,array(select jsonb_array_elements_text(coalesce(p->'strengths','[]'))));
   perform private.care_notice(uid,'Отзыв сохранён и отправлен на модерацию','/diary');
  elsif p_action='message' then
   if a.parent_id<>uid and a.specialist_id is distinct from sid then raise exception 'Нет доступа к переписке';end if;
   insert into public.care_messages(appointment_id,sender_id,body) values(a.id,uid,p->>'body');
   perform private.care_notice(case when uid=a.parent_id then (select owner_id from public.specialists where id=a.specialist_id) else a.parent_id end,'Новое сообщение по приёму',case when uid=a.parent_id then '/pro/requests' else '/diary' end);
  elsif p_action='consent' then
   if a.parent_id<>uid then raise exception 'Только родитель управляет доступом';end if;
   update public.appointments set share_diary=(p->>'enabled')::boolean,diagnosis=case when (p->>'enabled')::boolean then diagnosis else '' end where id=a.id;
  end if;
 elsif p_action in ('slot_add','slot_remove','working_days') then
  if sid is null then raise exception 'Нужен кабинет специалиста';end if;
  if p_action='slot_add' then
   insert into public.schedule_slots(specialist_id,starts_at,ends_at,service,price) values(sid,(p->>'starts_at')::timestamptz,(p->>'starts_at')::timestamptz+interval '45 minutes',coalesce(p->>'service','Консультация'),(p->>'price')::integer);
  elsif p_action='slot_remove' then delete from public.schedule_slots where id=(p->>'id')::uuid and specialist_id=sid and available and not exists(select 1 from public.appointments where slot_id=(p->>'id')::uuid or proposed_slot_id=(p->>'id')::uuid);
  else update public.specialists set profile=profile||jsonb_build_object('working_days',p->>'days') where id=sid;end if;
 elsif p_action='profile' then
  if sid is null then raise exception 'Нужен кабинет специалиста';end if;
  if p->>'district' not in ('Алатауский','Алмалинский','Ауэзовский','Бостандыкский','Жетысуский','Медеуский','Наурызбайский','Турксибский') then raise exception 'Выберите район Алматы';end if;
  update public.specialists set name=p->>'name',specialty=p->>'specialty',price=(p->>'price')::integer,experience=(p->>'experience')::integer,online=(p->>'online')::boolean,district=p->>'district',address=p->>'address',description=p->>'description',profile=coalesce(p->'profile','{}'),ages=array(select jsonb_array_elements_text(p->'ages')),concerns=array(select jsonb_array_elements_text(p->'concerns')) where id=sid;
 elsif p_action in ('assign','goal') then
  oid=(p->>'child_id')::uuid;
  if sid is null or not private.has_patient(oid) then raise exception 'Нет согласия на работу с ребёнком';end if;
  select parent_id into target from public.children where id=oid;
  if p_action='goal' then
   aid=nullif(p->>'id','')::uuid;
   if aid is null then insert into public.child_goals(parent_id,child_id,specialist_id,title,metric,target,due_at,stage) values(target,oid,sid,p->>'title','Согласованные этапы',4,(p->>'due_at')::date,1) returning id into aid;
   else update public.child_goals set title=coalesce(p->>'title',title),stage=coalesce((p->>'stage')::integer,stage) where id=aid and specialist_id=sid and child_id=oid;if not found then raise exception 'Цель недоступна';end if;end if;
   perform private.care_notice(target,'Специалист обновил цель месяца','/child/goals');result=jsonb_build_object('id',aid);
  else
   select * into mat from public.task_materials where id=(p->>'material_id')::uuid;
   if mat.id is null or mat.status<>'approved' or (mat.is_demo and not dem) then raise exception 'Материал не утверждён';end if;
   aid=nullif(p->>'goal_id','')::uuid;
   if aid is not null and not exists(select 1 from public.child_goals where id=aid and child_id=oid) then raise exception 'Цель другого ребёнка';end if;
   insert into public.task_assignments(parent_id,child_id,specialist_id,material_id,goal_id,goal_title,duration,frequency,due_at,comment) values(target,oid,sid,mat.id,aid,coalesce((select title from public.child_goals where id=aid),p->>'goal_title','Обсудить на приёме'),(p->>'duration')::integer,p->>'frequency',(p->>'due_at')::date,coalesce(p->>'comment',''));
   perform private.care_notice(target,'Специалист назначил новое задание','/diary?tab=home');
  end if;
 elsif p_action in ('complete','assignment_update','remind','share','revoke_share') then
  select * into asgn from public.task_assignments where id=(p->>'assignment_id')::uuid for update;
  if asgn.id is null then raise exception 'Задание недоступно';end if;
  if p_action='assignment_update' then
   if asgn.specialist_id is distinct from sid or not private.has_patient(asgn.child_id) then raise exception 'Нет доступа';end if;
   update public.task_assignments set frequency=coalesce(p->>'frequency',frequency),due_at=coalesce((p->>'due_at')::date,due_at),status=coalesce(p->>'status',status) where id=asgn.id;
   perform private.care_notice(asgn.parent_id,'Изменено назначение специалиста','/diary?tab=home');
  else
   if asgn.parent_id<>uid then raise exception 'Задание другой семьи';end if;
   if p_action='complete' then
    if asgn.status='cancelled' then raise exception 'Назначение отменено';end if;
    insert into public.task_completions(assignment_id,child_id,parent_id,specialist_id,outcome,comment) values(asgn.id,asgn.child_id,uid,asgn.specialist_id,p->>'outcome',coalesce(p->>'comment',''));
    update public.task_assignments set status=case when p->>'outcome'='difficult' then 'difficult' else 'done' end where id=asgn.id;
    perform private.care_notice((select owner_id from public.specialists where id=asgn.specialist_id),case when p->>'outcome'='difficult' then 'Родителю было трудно выполнить задание' else 'Родитель выполнил задание' end,'/pro/tasks');
   elsif p_action='remind' then insert into public.care_reminders(user_id,title,"to",due_at) values(uid,'Напоминание о домашнем задании','/diary?tab=home',(p->>'due_at')::timestamptz);
   elsif p_action='share' then
    tok=encode(extensions.gen_random_bytes(32),'hex');expiry=now()+interval '2 days';
    insert into public.family_task_links(parent_id,assignment_id,token_hash,expires_at) values(uid,asgn.id,encode(extensions.digest(tok,'sha256'),'hex'),expiry) returning id into aid;
    result=jsonb_build_object('token',tok,'id',aid,'expires_at',expiry);
   else update public.family_task_links set revoked=true where parent_id=uid and assignment_id=asgn.id;end if;
  end if;
 elsif p_action='material' then
  if sid is null or not coalesce((p->>'rights_confirmed')::boolean,false) then raise exception 'Подтвердите права на материал';end if;
  insert into public.task_materials(author_id,title,goal,duration,items,steps,signs,stop,video_url,memo_url,captions_ru,captions_kk,rights_confirmed,is_demo) values(uid,p->>'title',p->>'goal',(p->>'duration')::integer,array(select jsonb_array_elements_text(p->'items')),array(select jsonb_array_elements_text(p->'steps')),p->>'signs',p->>'stop',nullif(p->>'video_url',''),nullif(p->>'memo_url',''),nullif(p->>'captions_ru',''),nullif(p->>'captions_kk',''),true,dem);
 elsif p_action='waitlist' then
  if rol is distinct from 'parent' then raise exception 'Только родитель';end if;
  insert into public.waitlist(parent_id,specialist_id,consent) values(uid,(p->>'specialist_id')::uuid,true) on conflict(parent_id,specialist_id) do nothing;
 elsif p_action='clinic_profile' then
  if cid is null then raise exception 'Нет клиники';end if;
  update public.clinics set name=p->>'name',district=p->>'district',address=p->>'address',description=p->>'description',services=p->>'services',contacts=p->>'contacts' where id=cid;
 elsif p_action='branch' then
  if cid is null then raise exception 'Нет клиники';end if;
  insert into public.clinic_branches(clinic_id,name,district,address) values(cid,p->>'name',p->>'district',p->>'address');
 elsif p_action='invite' then
  if cid is null then raise exception 'Нет клиники';end if;
  insert into public.clinic_invitations(clinic_id,email) values(cid,lower(p->>'email')) on conflict(clinic_id,email) do update set status='pending';
 elsif p_action='accept_invite' then
  if sid is null then raise exception 'Нужен кабинет специалиста';end if;
  select clinic_id into oid from public.clinic_invitations where id=(p->>'id')::uuid and lower(email)=lower((select email from auth.users where id=uid)) and status='pending' for update;
  if oid is null then raise exception 'Приглашение недоступно';end if;
  insert into public.clinic_members(clinic_id,specialist_id) values(oid,sid) on conflict(clinic_id,specialist_id) do update set status='active';
  update public.clinic_invitations set status='accepted' where id=(p->>'id')::uuid;
 elsif p_action='remove_member' then update public.clinic_members set status='removed' where clinic_id=cid and specialist_id=(p->>'specialist_id')::uuid;
 elsif p_action='qualification' then insert into public.qualification_documents(owner_id,title,document_url) values(uid,p->>'title',p->>'url');
 elsif p_action='report' then insert into public.review_reports(parent_id,review_id,reason) values(uid,(p->>'review_id')::uuid,p->>'reason');
 elsif p_action='moderate' then
  if not private.is_staff() then raise exception 'Нужны права модератора';end if;
  oid=(p->>'id')::uuid;
  if p->>'entity'='material' then update public.task_materials set status=p->>'status' where id=oid and rights_confirmed;
  elsif p->>'entity'='specialist' then update public.specialists set verification_status=p->>'status',published=(p->>'status'='approved') where id=oid;
  elsif p->>'entity'='clinic' then update public.clinics set status=p->>'status' where id=oid;
  elsif p->>'entity'='qualification' then update public.qualification_documents set status=p->>'status' where id=oid;
  elsif p->>'entity'='review' then update public.reviews set status=case when p->>'status'='approved' then 'verified' else 'rejected' end where id=oid and visit_verified;
  elsif p->>'entity'='rule' then update public.recommendation_rules set approved=(p->>'status'='approved'),enabled=(p->>'status'='approved') where id=oid;
  else raise exception 'Недопустимый объект';end if;
 elsif p_action='rule' then
  if not private.is_staff() then raise exception 'Нет доступа';end if;
  update public.recommendation_rules set title=p->>'title',explanation=p->>'explanation',conditions=p->'conditions',approved=false,enabled=false where id=(p->>'id')::uuid;
 elsif p_action='district' then
  if not private.is_staff() then raise exception 'Нет доступа';end if;
  insert into public.districts(city_id,name) values((select id from public.cities where name='Алматы'),p->>'name') on conflict do nothing;
 else raise exception 'Неизвестное действие';end if;
 insert into public.audit_logs(actor_id,entity,entity_id,action) values(uid,'care',coalesce(p->>'appointment_id',p->>'assignment_id',p->>'id',aid::text),p_action);
 return result;
end$$;
create function public.care_command(p_action text,p jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.care_command(p_action,p)$$;
revoke all on function private.care_command(text,jsonb),public.care_command(text,jsonb) from public,anon;
grant execute on function private.care_command(text,jsonb),public.care_command(text,jsonb) to authenticated;

-- A snapshot assembled under RLS. Clinic scheduling is a deliberately minimal projection.
create function private.clinic_schedule() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'specialist_id',a.specialist_id,'slot_id',a.slot_id,'starts_at',a.starts_at,'ends_at',a.ends_at,'status',a.status,'service',a.service,'clinic_id',a.clinic_id,'is_demo',a.is_demo,'visit_verified',a.visit_verified)),'[]') from public.appointments a join public.clinics c on c.id=a.clinic_id where c.owner_id=auth.uid() and auth.uid() is not null
$$;
revoke all on function private.clinic_schedule() from public,anon;
grant execute on function private.clinic_schedule() to authenticated;
create function private.provider_schedule() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg((to_jsonb(a)-'diagnosis') || jsonb_build_object('diagnosis',case when a.share_diary and a.status in ('confirmed','attended','completed') then a.diagnosis else '' end,'child_age',c.age,'child_district',c.district)),'[]') from public.appointments a join public.specialists s on s.id=a.specialist_id join public.children c on c.id=a.child_id where s.owner_id=auth.uid() and auth.uid() is not null
$$;
create function private.shared_patients() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'label',c.label,'age',c.age,'city',c.city,'district',c.district,'concerns',c.concerns,'experience',c.experience,'format',c.format,'budget',c.budget)),'[]') from public.children c where auth.uid() is not null and private.has_patient(c.id)
$$;
create function private.review_summaries() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(case when r.parent_id=auth.uid() then to_jsonb(r)-'evidence'-'feedback_id' else to_jsonb(r)-'evidence'-'feedback_id'-'parent_id'-'appointment_id' end),'[]') from public.reviews r where auth.uid() is not null and (r.parent_id=auth.uid() or private.is_staff() or (r.status='verified' and r.visit_verified and (not r.is_demo or private.demo_actor())))
$$;
revoke all on function private.provider_schedule(),private.shared_patients(),private.review_summaries() from public,anon;
grant execute on function private.provider_schedule(),private.shared_patients(),private.review_summaries() to authenticated;
drop policy public_reviews on public.reviews;
create function public.care_snapshot() returns jsonb language plpgsql security invoker set search_path='' as $$declare rol text;res jsonb;begin
 if auth.uid() is null then raise exception 'Войдите в аккаунт';end if;
 rol=coalesce(private.care_role(),'parent');
 -- Reminders are delivered on server polling; no external service is required.
 perform public.deliver_care_reminders();
 select jsonb_build_object('role',rol,'is_demo',private.demo_actor(),
 'specialists',(select coalesce(jsonb_agg(to_jsonb(s)),'[]') from public.specialists s),
 'slots',(select coalesce(jsonb_agg(to_jsonb(s)),'[]') from public.schedule_slots s where starts_at>now()-interval '1 day'),
 'appointments',case when rol='clinic' then private.clinic_schedule() when rol='specialist' then private.provider_schedule() else (select coalesce(jsonb_agg(to_jsonb(a)),'[]') from public.appointments a) end,
 'patients',case when rol='specialist' then private.shared_patients() else '[]'::jsonb end,
 'materials',(select coalesce(jsonb_agg(to_jsonb(m)),'[]') from public.task_materials m),
 'assignments',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.task_assignments t),
 'completions',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.task_completions t),
 'clinics',(select coalesce(jsonb_agg(to_jsonb(c)),'[]') from public.clinics c),
 'members',(select coalesce(jsonb_agg(to_jsonb(c)),'[]') from public.clinic_members c),
 'branches',(select coalesce(jsonb_agg(to_jsonb(c)),'[]') from public.clinic_branches c),
 'invitations',(select coalesce(jsonb_agg(to_jsonb(c)),'[]') from public.clinic_invitations c),
 'reviews',private.review_summaries(),
 'messages',(select coalesce(jsonb_agg(to_jsonb(m)),'[]') from public.care_messages m),
 'shares',(select coalesce(jsonb_agg(to_jsonb(l)-'token_hash'-'parent_id'),'[]') from public.family_task_links l),
 'history',(select coalesce(jsonb_agg(to_jsonb(l)),'[]') from (select * from public.audit_logs where actor_id=auth.uid() order by created_at desc limit 100) l),
 'rules',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.recommendation_rules r),
 'reports',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.review_reports r)
 ) into res;return res;
end$$;
revoke all on function public.care_snapshot() from public,anon;
grant execute on function public.care_snapshot() to authenticated;
create function private.deliver_care_reminders() returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null then return;end if;
 with due as (update public.care_reminders set delivered=true where user_id=auth.uid() and not delivered and due_at<=now() returning *) insert into public.notifications(parent_id,title,"to") select user_id,title,"to" from due;
end$$;
create function public.deliver_care_reminders() returns void language sql security invoker set search_path='' as $$select private.deliver_care_reminders()$$;
revoke all on function private.deliver_care_reminders(),public.deliver_care_reminders() from public,anon;
grant execute on function private.deliver_care_reminders(),public.deliver_care_reminders() to authenticated;

create function private.family_task(p_token text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('title',m.title,'goal',m.goal,'steps',m.steps,'items',m.items,'duration',a.duration,'frequency',a.frequency,'due_at',a.due_at,'signs',m.signs,'stop',m.stop,'video_url',m.video_url,'memo_url',m.memo_url,'captions_ru',m.captions_ru,'captions_kk',m.captions_kk,'is_demo',m.is_demo)
 from public.family_task_links l join public.task_assignments a on a.id=l.assignment_id join public.task_materials m on m.id=a.material_id where l.token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and not l.revoked and l.expires_at>now() and a.status<>'cancelled' and m.status='approved' and length(p_token)=64
$$;
create function public.family_task(p_token text) returns jsonb language sql security invoker set search_path='' as $$select private.family_task(p_token)$$;
revoke all on function private.family_task(text),public.family_task(text) from public;
grant usage on schema private to anon;
grant execute on function private.family_task(text),public.family_task(text) to anon,authenticated;

-- Correct directory without deleting historical districts or non-demo family information.
insert into public.cities(name) values('Алматы') on conflict do nothing;
insert into public.districts(city_id,name) select c.id,d from public.cities c cross join unnest(array['Алатауский','Алмалинский','Ауэзовский','Бостандыкский','Жетысуский','Медеуский','Наурызбайский','Турксибский']) d where c.name='Алматы' on conflict do nothing;
with numbered as (select id,row_number() over(order by id) n from public.specialists where is_demo) update public.specialists s set city='Алматы',district=(array['Бостандыкский','Алмалинский','Ауэзовский','Алатауский','Жетысуский','Медеуский','Наурызбайский','Турксибский'])[1+((n-1)%8)::int],verification_status='approved' from numbered where s.id=numbered.id;
update public.questions set city='Алматы' where is_demo;
alter table public.children alter column city set default 'Алматы';
alter table public.questions alter column city set default 'Алматы';
-- Limit public product data to signed-in accounts, preserving public city directories/legal/landing.
revoke select on public.specialists,public.specialist_services,public.questions,public.answers,public.reviews,public.medical_terms,public.recommendation_rules from anon;

create index slots_specialist_start on public.schedule_slots(specialist_id,starts_at);
create index appointments_provider on public.appointments(specialist_id,status);
create index appointments_clinic on public.appointments(clinic_id,starts_at);
create index assignments_child on public.task_assignments(child_id,specialist_id);
create index assignments_parent on public.task_assignments(parent_id);
create index completions_parent on public.task_completions(parent_id,created_at);
create index completions_assignment on public.task_completions(assignment_id);
create index messages_appointment on public.care_messages(appointment_id);
create index members_specialist on public.clinic_members(specialist_id);
create index reminders_due on public.care_reminders(user_id,due_at) where not delivered;

create policy own_care_history on public.audit_logs for select to authenticated using(actor_id=(select auth.uid()) and entity='care');
create policy staff_reports on public.review_reports for select to authenticated using((select private.is_staff()));
create policy staff_materials on public.qualification_documents for select to authenticated using((select private.is_staff()));
-- Public ratings and counts include only moderated, attendance-backed observations.
create function private.refresh_contact_rating() returns trigger language plpgsql security definer set search_path='' as $$declare sid uuid;begin
 sid=case when tg_op='DELETE' then old.specialist_id else new.specialist_id end;
 update public.specialists s set verified_count=(select count(*) from public.reviews where specialist_id=sid and status='verified' and visit_verified),contact_rating=(select case when count(*)>=5 then round(avg(contact),1) else null end from public.reviews where specialist_id=sid and status='verified' and visit_verified) where s.id=sid;
 return null;end$$;
revoke all on function private.refresh_contact_rating() from public,anon,authenticated;
create trigger refresh_contact_rating after insert or update or delete on public.reviews for each row execute function private.refresh_contact_rating();
-- Protect existing specialist-set goal stages from parent upserts through legacy forms.
create function private.protect_professional_goal() returns trigger language plpgsql set search_path='' as $$begin
 if current_user='authenticated' and old.specialist_id is not null and (new.title is distinct from old.title or new.stage is distinct from old.stage or new.specialist_id is distinct from old.specialist_id or new.target is distinct from old.target) then raise exception 'Цель специалиста редактируется в его кабинете';end if;return new;end$$;
revoke all on function private.protect_professional_goal() from public,anon,authenticated;
create trigger protect_professional_goal before update on public.child_goals for each row execute function private.protect_professional_goal();
alter table public.notifications add column source_key text;
create unique index notification_dedup on public.notifications(parent_id,source_key) where source_key is not null;
create or replace function private.deliver_care_reminders() returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null then return;end if;
 with due as (update public.care_reminders set delivered=true where user_id=auth.uid() and not delivered and due_at<=now() returning *) insert into public.notifications(parent_id,title,"to") select user_id,title,"to" from due;
 insert into public.notifications(parent_id,title,"to",source_key) select parent_id,'Напоминание: приём в ближайшие сутки','/diary','appointment:'||id from public.appointments where parent_id=auth.uid() and status='confirmed' and starts_at>now() and starts_at<now()+interval '1 day' on conflict do nothing;
 insert into public.notifications(parent_id,title,"to",source_key) select parent_id,'Приближается срок домашнего задания','/diary?tab=home','assignment:'||id||':'||due_at from public.task_assignments where parent_id=auth.uid() and status in ('new','active','difficult') and due_at between current_date and current_date+1 on conflict do nothing;
end$$;
