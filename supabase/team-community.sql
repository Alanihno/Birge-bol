create table public.care_team_access(child_id uuid not null,parent_id uuid not null,specialist_id uuid not null references public.specialists(id),active boolean not null default true,created_at timestamptz not null default now(),primary key(child_id,specialist_id),foreign key(child_id,parent_id) references public.children(id,parent_id) on delete cascade);
alter table public.care_team_access enable row level security;
revoke all on public.care_team_access from public,anon,authenticated;grant select on public.care_team_access to authenticated;
create function private.team_member(cid uuid) returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and exists(select 1 from public.care_team_access t join public.specialists s on s.id=t.specialist_id where t.child_id=cid and t.active and s.owner_id=auth.uid())$$;
revoke all on function private.team_member(uuid) from public,anon;grant execute on function private.team_member(uuid) to authenticated;
create policy team_access_read on public.care_team_access for select to authenticated using(parent_id=(select auth.uid()) or (active and private.team_member(child_id)));
create or replace function private.has_patient(cid uuid) returns boolean language sql stable security definer set search_path='' as $$select private.team_member(cid) or exists(select 1 from public.appointments a join public.specialists s on s.id=a.specialist_id where a.child_id=cid and s.owner_id=auth.uid() and a.share_diary and a.status in ('confirmed','attended','completed'))$$;
create policy team_assignment_read on public.task_assignments for select to authenticated using(private.team_member(child_id));
create policy team_completion_read on public.task_completions for select to authenticated using(private.team_member(child_id));
create function private.set_team_access(p_child_id uuid,p_specialist_id uuid,p_granted boolean) returns boolean language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from public.children where id=p_child_id and parent_id=auth.uid()) then raise exception 'Нет доступа к ребёнку';end if;
 if not exists(select 1 from public.specialists where id=p_specialist_id and published) then raise exception 'Специалист недоступен';end if;
 insert into public.care_team_access(child_id,parent_id,specialist_id,active) values(p_child_id,auth.uid(),p_specialist_id,p_granted) on conflict(child_id,specialist_id) do update set active=excluded.active;
 if not p_granted then update public.appointments set share_diary=false,diagnosis='' where child_id=p_child_id and specialist_id=p_specialist_id and parent_id=auth.uid();end if;
 return true;end$$;
revoke all on function private.set_team_access(uuid,uuid,boolean) from public,anon;grant execute on function private.set_team_access(uuid,uuid,boolean) to authenticated;
create function public.care_set_team_access(p_child_id uuid,p_specialist_id uuid,p_granted boolean) returns boolean language sql security invoker set search_path='' as $$select private.set_team_access(p_child_id,p_specialist_id,p_granted)$$;
revoke all on function public.care_set_team_access(uuid,uuid,boolean) from public,anon;grant execute on function public.care_set_team_access(uuid,uuid,boolean) to authenticated;
create table public.team_recommendations(id uuid primary key default gen_random_uuid(),child_id uuid not null,parent_id uuid not null,specialist_id uuid not null references public.specialists(id),body text not null check(length(btrim(body)) between 10 and 2000),created_at timestamptz not null default now(),foreign key(child_id,parent_id) references public.children(id,parent_id) on delete cascade);
create index team_notes_child on public.team_recommendations(child_id,created_at desc);
alter table public.team_recommendations enable row level security;revoke all on public.team_recommendations from public,anon,authenticated;
grant select on public.team_recommendations to authenticated;grant insert(child_id,specialist_id,body) on public.team_recommendations to authenticated;
create policy team_notes_read on public.team_recommendations for select to authenticated using(parent_id=(select auth.uid()) or private.team_member(child_id));
create policy team_notes_write on public.team_recommendations for insert to authenticated with check(private.owns_specialist(specialist_id) and private.team_member(child_id));
create function private.guard_team_note() returns trigger language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is not null then
  if not private.owns_specialist(new.specialist_id) or not private.team_member(new.child_id) then raise exception 'Доступ к общему плану не разрешён';end if;
  perform pg_advisory_xact_lock(hashtext('team-note:'||auth.uid()::text));
  if (select count(*) from public.team_recommendations r join public.specialists s on s.id=r.specialist_id where s.owner_id=auth.uid() and r.created_at>now()-interval '24 hours')>=20 then raise exception 'Не больше 20 рекомендаций за сутки';end if;
 end if;
 select parent_id into new.parent_id from public.children where id=new.child_id;new.created_at:=now();return new;end$$;
revoke all on function private.guard_team_note() from public,anon,authenticated;
create trigger team_note_guard before insert on public.team_recommendations for each row execute function private.guard_team_note();

alter table public.questions drop constraint questions_topic_check;
alter table public.questions add constraint questions_topic_check check(topic in('Новости','Мероприятия','Поведение','Обучение','Сон и быт','Семья','Речь','Занятия','ПМПК','Поддержка'));
create table public.community_preferences(user_id uuid primary key references auth.users(id) on delete cascade,topics text[] not null default '{}',notify_new boolean not null default true,check(topics<@array['Новости','Мероприятия','Поведение','Обучение','Сон и быт','Семья','Речь','Занятия','ПМПК','Поддержка']::text[]));
alter table public.community_preferences enable row level security;revoke all on public.community_preferences from public,anon,authenticated;grant select,insert,update on public.community_preferences to authenticated;
create policy community_preferences_own on public.community_preferences for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create function private.community_publish() returns trigger language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is not null and private.demo_actor() then new.is_demo:=true;new.status:='open';end if;return new;end$$;
revoke all on function private.community_publish() from public,anon,authenticated;
create trigger community_contest_publish before insert on public.questions for each row execute function private.community_publish();
alter policy submit_questions on public.questions with check(parent_id=(select auth.uid()) and ((status in('draft','pending_moderation') and not is_demo) or (private.demo_actor() and is_demo and status='open')));
create function private.notify_new_thread() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.status not in('open','answered') then return null;end if;
 if tg_op='UPDATE' then if old.status in('open','answered') then return null;end if;end if;
 insert into public.notifications(parent_id,title,"to",source_key) select p.user_id,'Новая ветка · '||new.topic||': '||new.title,'/moms/questions/'||new.id,'thread:'||new.id||':'||p.user_id from public.community_preferences p where p.notify_new and p.user_id is distinct from new.parent_id and (cardinality(p.topics)=0 or new.topic=any(p.topics)) on conflict do nothing;
 return null;end$$;
revoke all on function private.notify_new_thread() from public,anon,authenticated;
create trigger new_thread_notification after insert or update of status on public.questions for each row execute function private.notify_new_thread();
create table public.community_replies(id uuid primary key default gen_random_uuid(),question_id uuid not null references public.questions(id) on delete cascade,parent_id uuid not null references auth.users(id) on delete cascade,parent_reply_id uuid,parent_answer_id uuid references public.answers(id) on delete cascade,body text not null check(length(btrim(body)) between 3 and 1200),status text not null default 'pending' check(status in('pending','approved','rejected')),created_at timestamptz not null default now(),unique(id,question_id),foreign key(parent_reply_id,question_id) references public.community_replies(id,question_id) on delete cascade,check(parent_reply_id is null or parent_answer_id is null));
create index community_replies_thread on public.community_replies(question_id,created_at);
alter table public.community_replies enable row level security;revoke all on public.community_replies from public,anon,authenticated;
grant select on public.community_replies to authenticated;grant insert(question_id,parent_id,parent_reply_id,parent_answer_id,body) on public.community_replies to authenticated;grant update(status) on public.community_replies to authenticated;
create policy community_reply_read on public.community_replies for select to authenticated using((status='approved' or parent_id=(select auth.uid()) or private.is_staff()) and exists(select 1 from public.questions q where q.id=question_id));
create policy community_reply_create on public.community_replies for insert to authenticated with check(parent_id=(select auth.uid()) and exists(select 1 from public.questions q where q.id=question_id and q.status in('open','answered')));
create policy community_reply_moderate on public.community_replies for update to authenticated using(private.is_staff()) with check(private.is_staff());
create function private.community_reply_guard() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.parent_answer_id is not null and not exists(select 1 from public.answers where id=new.parent_answer_id and question_id=new.question_id and approved) then raise exception 'Ответ относится к другой ветке';end if;
 if new.parent_reply_id is not null and not exists(select 1 from public.community_replies where id=new.parent_reply_id and question_id=new.question_id and (status='approved' or parent_id=auth.uid())) then raise exception 'Ответ недоступен';end if;
 new.status:=case when private.demo_actor() then 'approved' else 'pending' end;new.created_at:=now();return new;end$$;
revoke all on function private.community_reply_guard() from public,anon,authenticated;
create trigger community_reply_guard before insert on public.community_replies for each row execute function private.community_reply_guard();
create trigger community_reply_limit before insert on public.community_replies for each row execute function private.limit_submissions();
insert into public.community_preferences(user_id,topics,notify_new) values('20000000-0000-4000-8000-000000000001',array['Речь','Поведение','Мероприятия'],true) on conflict do nothing;
insert into public.care_team_access(child_id,parent_id,specialist_id,active) select '10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',s.id,true from public.specialists s where s.id='00000000-0000-4000-8000-000000000001' or s.id in(md5('bb-contest-provider-bravo-kids-0')::uuid,md5('bb-contest-provider-resource-1')::uuid) on conflict do nothing;
insert into public.team_recommendations(id,child_id,parent_id,specialist_id,body) select md5('bb-team-note-'||t.specialist_id)::uuid,t.child_id,t.parent_id,t.specialist_id,case when t.specialist_id='00000000-0000-4000-8000-000000000001' then 'Общая цель: согласовать с семьёй наблюдаемые способы общения и один понятный следующий шаг. На следующей встрече обсудим короткие записи родителей.' else 'Перед следующей встречей ознакомлюсь с общей целью и наблюдениями семьи. Рекомендации и нагрузку согласуем с другими участниками команды, чтобы не дублировать задания.' end from public.care_team_access t where t.child_id='10000000-0000-4000-8000-000000000001' and t.active on conflict do nothing;
insert into public.app_graph_nodes(id,label,kind,routes,roles,tables,description,x,y) values('team','Команда ребёнка','screen','{"parent":"/child/team","specialist":"/pro/kids"}',array['parent','specialist'],array['care_team_access','team_recommendations','child_goals'],'Общий план и рекомендации специалистов по разрешению родителя',450,120) on conflict do nothing;
insert into public.app_graph_edges(source,target,relation,key) values('family','team','разрешает общий план','child_id'),('team','providers','доступ по согласию','specialist_id') on conflict do nothing;
insert into public.app_graph_keywords(node_id,keyword) select 'team',keyword from unnest(array['команда','совместно','общий план','рекомендации','несколько специалистов','доступ'])keyword on conflict do nothing;
create table public.content_translations(source_kind text not null check(source_kind in('reply','team','question','answer')),source_id uuid not null,target_language text not null check(target_language in('ru','kk')),source_hash text not null,translated_text text not null check(length(translated_text) between 1 and 6000),created_at timestamptz not null default now(),primary key(source_kind,source_id,target_language));
alter table public.content_translations enable row level security;revoke all on public.content_translations from public,anon,authenticated;grant select on public.content_translations to authenticated;grant all on public.content_translations to service_role;
create policy authorized_content_translation on public.content_translations for select to authenticated using((source_kind='reply' and exists(select 1 from public.community_replies r where r.id=source_id)) or (source_kind='team' and exists(select 1 from public.team_recommendations r where r.id=source_id)) or (source_kind='question' and exists(select 1 from public.questions q where q.id=source_id)) or (source_kind='answer' and exists(select 1 from public.answers a where a.id=source_id)));
