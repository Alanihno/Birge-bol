create table public.support_tickets(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 category text not null check(category in ('booking','payment','privacy','account','other')),
 subject text not null check(length(btrim(subject)) between 5 and 120),
 body text not null check(length(btrim(body)) between 10 and 2000),
 status text not null default 'open' check(status in ('open','in_progress','answered','closed')),
 reply text not null default '' check(length(reply)<=4000),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index support_owner_recent on public.support_tickets(user_id,created_at desc);
alter table public.support_tickets enable row level security;
revoke all on public.support_tickets from public,anon,authenticated;
grant select on public.support_tickets to authenticated;
grant insert(user_id,category,subject,body) on public.support_tickets to authenticated;
grant update(status,reply) on public.support_tickets to authenticated;
create policy support_read on public.support_tickets for select to authenticated using(user_id=(select auth.uid()) or (select private.is_staff()));
create policy support_create on public.support_tickets for insert to authenticated with check(user_id=(select auth.uid()) and status='open' and reply='');
create policy support_staff_reply on public.support_tickets for update to authenticated using((select private.is_staff())) with check((select private.is_staff()));
create function private.guard_support_ticket() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  if auth.uid() is null or new.user_id<>auth.uid() then raise exception 'Войдите в аккаунт';end if;
  perform pg_advisory_xact_lock(hashtext('support:'||auth.uid()::text));
  if (select count(*) from public.support_tickets where user_id=auth.uid() and created_at>now()-interval '24 hours')>=5 then raise exception 'Можно отправить не больше 5 обращений за сутки';end if;
  new.status:='open';new.reply:='';new.created_at:=now();
 elsif not private.is_staff() then raise exception 'Только поддержка может менять статус и ответ';end if;
 new.updated_at:=now();return new;
end $$;
revoke all on function private.guard_support_ticket() from public,anon,authenticated;
create trigger support_guard before insert or update on public.support_tickets for each row execute function private.guard_support_ticket();
create function private.notify_support_reply() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.reply<>old.reply and length(btrim(new.reply))>0 then
  insert into public.notifications(parent_id,title,"to",source_key) values(new.user_id,'Поддержка ответила: '||new.subject,'/support','support:'||new.id::text||':'||new.updated_at::text);
 end if;return null;
end $$;
revoke all on function private.notify_support_reply() from public,anon,authenticated;
create trigger support_reply_notification after update on public.support_tickets for each row execute function private.notify_support_reply();
insert into public.app_graph_nodes(id,label,kind,routes,roles,tables,description,x,y)
 values('support','Безопасность и поддержка','screen','{"parent":"/support","specialist":"/support","clinic":"/support"}',array['parent','specialist','clinic'],array['support_tickets'],'Настройки доступа, помощь и личные обращения',105,440) on conflict(id) do nothing;
insert into public.app_graph_edges(source,target,relation,key) values('birge','support','помощь и защита данных','user_id → auth.users.id') on conflict do nothing;
insert into public.app_graph_keywords(node_id,keyword) select 'support',keyword from unnest(array['поддержка','безопасность','помощь','проблема','ошибка','защита','жалоба','обращение','доступ','пароль'])keyword on conflict do nothing;
