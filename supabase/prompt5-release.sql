-- Additive release. No real user rows are removed. Telegram is intentionally untouched.
create table public.consent_events(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('platform','child_authority','data_share')),document_version text not null check(length(document_version) between 1 and 80),
 granted boolean not null,recipient_id uuid,created_at timestamptz not null default now()
);
alter table public.consent_events enable row level security;
create policy consent_read on public.consent_events for select to authenticated using(user_id=(select auth.uid()));
create policy consent_insert on public.consent_events for insert to authenticated with check(user_id=(select auth.uid()) and document_version='2026-11-17.draft.1');
grant select,insert on public.consent_events to authenticated;
create index consent_user_time on public.consent_events(user_id,created_at desc);

create table public.push_subscriptions(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique check(length(endpoint)<2048),p256dh text not null check(length(p256dh) between 80 and 100),auth text not null check(length(auth) between 20 and 30),
 updated_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy push_own_read on public.push_subscriptions for select to authenticated using(user_id=(select auth.uid()));
create policy push_own_delete on public.push_subscriptions for delete to authenticated using(user_id=(select auth.uid()));
grant select,delete on public.push_subscriptions to authenticated;
create index push_owner on public.push_subscriptions(user_id);

-- Scoped definer required for atomic device reassignment; endpoint is a browser capability.
create function public.register_push_device(p_endpoint text,p_p256dh text,p_auth text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'auth';end if;
 if p_endpoint !~ '^https://(fcm.googleapis.com|updates.push.services.mozilla.com|web.push.apple.com|[a-z0-9.-]+\.notify.windows.com)/' or length(p_endpoint)>2048 or p_p256dh !~ '^[A-Za-z0-9_-]{87}=?$' or p_auth !~ '^[A-Za-z0-9_-]{22}==?$' and p_auth !~ '^[A-Za-z0-9_-]{22}$' then raise exception 'body';end if;
 if (select count(*) from public.push_subscriptions where user_id=auth.uid())>=10 and not exists(select 1 from public.push_subscriptions where endpoint=p_endpoint and user_id=auth.uid()) then raise exception 'quota';end if;
 insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values(auth.uid(),p_endpoint,p_p256dh,p_auth)
 on conflict(endpoint) do update set user_id=auth.uid(),p256dh=excluded.p256dh,auth=excluded.auth,updated_at=now();
end $$;
revoke all on function public.register_push_device(text,text,text) from public,anon;
grant execute on function public.register_push_device(text,text,text) to authenticated;
create function public.remove_push_device(p_endpoint text) returns void language sql security invoker set search_path='' as $$delete from public.push_subscriptions where endpoint=p_endpoint and user_id=auth.uid();$$;
revoke all on function public.remove_push_device(text) from public,anon;
grant execute on function public.remove_push_device(text) to authenticated;

create table public.notification_preferences(user_id uuid primary key references auth.users(id) on delete cascade,appointments boolean not null default true,assignments boolean not null default true,messages boolean not null default true,payments boolean not null default true);
alter table public.notification_preferences enable row level security;
create policy preferences_own on public.notification_preferences for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update,delete on public.notification_preferences to authenticated;

create table private.push_deliveries(notification_id uuid not null references public.notifications(id) on delete cascade,subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,attempts integer not null default 0,lease_until timestamptz,sent_at timestamptz,last_code integer,primary key(notification_id,subscription_id));
alter table private.push_deliveries enable row level security;
create function public.claim_push_batch() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' and coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' is distinct from 'service_role' then raise exception 'auth';end if;
 insert into private.push_deliveries(notification_id,subscription_id)
 select n.id,s.id from public.notifications n join public.push_subscriptions s on s.user_id=n.parent_id
 where not n.read and n.created_at>now()-interval '24 hours' and n.created_at>=s.updated_at
 and not exists(select 1 from public.notification_preferences p where p.user_id=n.parent_id and
 case when n.source_key like '%payment%' then not p.payments when n.source_key like '%task%' or n.source_key like '%assignment%' then not p.assignments when n.source_key like '%message%' or n.source_key like '%question%' then not p.messages else not p.appointments end)
 on conflict do nothing;
 with candidates as(select d.notification_id,d.subscription_id from private.push_deliveries d where d.sent_at is null and d.attempts<5 and (d.lease_until is null or d.lease_until<now()) order by d.notification_id limit 50 for update skip locked),claimed as(update private.push_deliveries d set attempts=d.attempts+1,lease_until=now()+interval '5 minutes' from candidates c where d.notification_id=c.notification_id and d.subscription_id=c.subscription_id returning d.*)
 select coalesce(jsonb_agg(jsonb_build_object('notification_id',c.notification_id,'subscription_id',s.id,'endpoint',s.endpoint,'keys',jsonb_build_object('p256dh',s.p256dh,'auth',s.auth))),'[]'::jsonb) into result from claimed c join public.push_subscriptions s on s.id=c.subscription_id;
 return result;
end $$;
revoke all on function public.claim_push_batch() from public,anon,authenticated;
grant execute on function public.claim_push_batch() to service_role;
create function public.finish_push_delivery(p_notification uuid,p_subscription uuid,p_code integer) returns void language plpgsql security definer set search_path='' as $$
begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' and coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' is distinct from 'service_role' then raise exception 'auth';end if;
 if p_code in (404,410) then delete from public.push_subscriptions where id=p_subscription;else update private.push_deliveries set sent_at=case when p_code between 200 and 299 then now() else null end,last_code=p_code,lease_until=now()+interval '15 minutes' where notification_id=p_notification and subscription_id=p_subscription;end if;
end $$;
revoke all on function public.finish_push_delivery(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.finish_push_delivery(uuid,uuid,integer) to service_role;

-- Notification source keys already provide event idempotency. Reminders use the same inbox.
create function public.schedule_notification_reminders() returns integer language plpgsql security definer set search_path='' as $$
declare affected integer;
begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' and coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' is distinct from 'service_role' then raise exception 'auth';end if;
 insert into public.notifications(parent_id,title,"to",source_key)
 select parent_id,'Скоро приём в Birge Bol','/diary','reminder:appointment:'||id from public.appointments
 where status='confirmed' and starts_at>now() and starts_at<now()+interval '2 hours'
 on conflict(parent_id,source_key) where source_key is not null do nothing;
 get diagnostics affected=row_count;return affected;
end $$;
revoke all on function public.schedule_notification_reminders() from public,anon,authenticated;
grant execute on function public.schedule_notification_reminders() to service_role;

create table private.ai_metrics(id bigint generated always as identity primary key,created_at timestamptz not null default now(),feature text not null check(feature in('explain','translation')),outcome text not null check(outcome in('dictionary','cache','blocked','error','model')),input_tokens integer not null default 0 check(input_tokens>=0),output_tokens integer not null default 0 check(output_tokens>=0));
alter table private.ai_metrics enable row level security;
create function public.record_ai_metric(p_feature text,p_outcome text,p_input integer default 0,p_output integer default 0) returns void language plpgsql security definer set search_path='' as $$
begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' and coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' is distinct from 'service_role' then raise exception 'auth';end if;
 insert into private.ai_metrics(feature,outcome,input_tokens,output_tokens) values(p_feature,p_outcome,p_input,p_output);
end $$;
revoke all on function public.record_ai_metric(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.record_ai_metric(text,text,integer,integer) to service_role;

-- Extend the existing material URL constraint; never accept arbitrary iframe/HTML.
alter table public.task_materials drop constraint safe_material_urls;
alter table public.task_materials add constraint safe_material_urls check(
 (video_url is null or video_url ~ '^(storage:[0-9a-f-]+/[^[:space:]]+|/video/[^[:space:]]+|https://www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11})$') and
 (memo_url is null or memo_url ~ '^(storage:[0-9a-f-]+/[^[:space:]]+|/materials/[^[:space:]]+)$') and
 (captions_ru is null or captions_ru ~ '^(storage:[0-9a-f-]+/[^[:space:]]+|/video/[^[:space:]]+)$') and
 (captions_kk is null or captions_kk ~ '^(storage:[0-9a-f-]+/[^[:space:]]+|/video/[^[:space:]]+)$'));
