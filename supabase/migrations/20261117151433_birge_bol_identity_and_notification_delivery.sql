-- Username accounts use an internal, non-routable Auth namespace. No external
-- email ownership is asserted. Existing email accounts keep their normal flow.
create extension if not exists pg_net with schema extensions;
create table private.identity_limits(key text not null,bucket text not null,window_start timestamptz not null,hits integer not null default 1,primary key(key,bucket,window_start));
create table private.identity_recovery(user_id uuid primary key references auth.users(id) on delete cascade,login_hash text unique not null,recovery_hash text not null,lease uuid,lease_until timestamptz,created_at timestamptz not null default now());
alter table private.identity_limits enable row level security;
alter table private.identity_recovery enable row level security;
revoke all on private.identity_limits,private.identity_recovery from public,anon,authenticated;

create function private.identity_attempt(p_login text,p_network text,p_bucket text) returns boolean language plpgsql security definer set search_path='' as $$
declare a integer;b integer;c integer;begin
 if p_login!~'^[a-f0-9]{64}$' or p_network!~'^[a-f0-9]{64}$' or p_bucket not in ('register','recover','push-test') then raise exception 'invalid';end if;
 delete from private.identity_limits where window_start<now()-interval '25 hours';
 insert into private.identity_limits(key,bucket,window_start) values(p_login,p_bucket,date_trunc('hour',now())) on conflict(key,bucket,window_start) do update set hits=private.identity_limits.hits+1 returning hits into a;
 insert into private.identity_limits(key,bucket,window_start) values(p_network,p_bucket,date_trunc('hour',now())) on conflict(key,bucket,window_start) do update set hits=private.identity_limits.hits+1 returning hits into b;
 insert into private.identity_limits(key,bucket,window_start) values('global',p_bucket,date_trunc('hour',now())) on conflict(key,bucket,window_start) do update set hits=private.identity_limits.hits+1 returning hits into c;
 return a<=case when p_bucket='push-test' then 10 else 5 end and b<=30 and c<=300;
end $$;
create function public.identity_attempt(p_login text,p_network text,p_bucket text) returns boolean language sql security invoker set search_path='' as $$select private.identity_attempt(p_login,p_network,p_bucket)$$;
create function private.set_identity_recovery(p_user uuid,p_login text,p_hash text) returns void language sql security definer set search_path='' as $$insert into private.identity_recovery(user_id,login_hash,recovery_hash) values(p_user,p_login,p_hash)$$;
create function public.set_identity_recovery(p_user uuid,p_login text,p_hash text) returns void language sql security invoker set search_path='' as $$select private.set_identity_recovery(p_user,p_login,p_hash)$$;
create function private.claim_identity_recovery(p_login text,p_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare r private.identity_recovery;begin
 update private.identity_recovery set lease=gen_random_uuid(),lease_until=now()+interval '2 minutes' where login_hash=p_login and recovery_hash=p_hash and (lease_until is null or lease_until<now()) returning * into r;
 return case when r.user_id is null then null else jsonb_build_object('user_id',r.user_id,'lease',r.lease) end;
end $$;
create function public.claim_identity_recovery(p_login text,p_hash text) returns jsonb language sql security invoker set search_path='' as $$select private.claim_identity_recovery(p_login,p_hash)$$;
create function private.finish_identity_recovery(p_user uuid,p_lease uuid,p_hash text) returns void language plpgsql security definer set search_path='' as $$begin
 update private.identity_recovery set recovery_hash=coalesce(p_hash,recovery_hash),lease=null,lease_until=null where user_id=p_user and lease=p_lease;
 if not found then raise exception 'lease';end if;
end $$;
create function public.finish_identity_recovery(p_user uuid,p_lease uuid,p_hash text) returns void language sql security invoker set search_path='' as $$select private.finish_identity_recovery(p_user,p_lease,p_hash)$$;

create function private.push_server_config() returns jsonb language sql security definer set search_path='' as $$
select coalesce(jsonb_object_agg(name,decrypted_secret),'{}'::jsonb) from vault.decrypted_secrets where name in ('birge_push_vapid_public','birge_push_vapid_private','birge_push_subject','birge_push_cron','birge_project_url')
$$;
create function public.push_server_config() returns jsonb language sql security invoker set search_path='' as $$select private.push_server_config()$$;
create function private.push_public_config() returns jsonb language sql security definer set search_path='' as $$select jsonb_build_object('public_key',(select decrypted_secret from vault.decrypted_secrets where name='birge_push_vapid_public'),'enabled',exists(select 1 from cron.job where jobname='birge-bol-push' and active))$$;
create function public.push_public_config() returns jsonb language sql security invoker set search_path='' as $$select private.push_public_config()$$;
revoke all on function private.identity_attempt(text,text,text),public.identity_attempt(text,text,text),private.set_identity_recovery(uuid,text,text),public.set_identity_recovery(uuid,text,text),private.claim_identity_recovery(text,text),public.claim_identity_recovery(text,text),private.finish_identity_recovery(uuid,uuid,text),public.finish_identity_recovery(uuid,uuid,text),private.push_server_config(),public.push_server_config() from public,anon,authenticated;
grant execute on function private.identity_attempt(text,text,text),public.identity_attempt(text,text,text),private.set_identity_recovery(uuid,text,text),public.set_identity_recovery(uuid,text,text),private.claim_identity_recovery(text,text),public.claim_identity_recovery(text,text),private.finish_identity_recovery(uuid,uuid,text),public.finish_identity_recovery(uuid,uuid,text),private.push_server_config(),public.push_server_config() to service_role;
revoke all on function private.push_public_config(),public.push_public_config() from public;
grant execute on function private.push_public_config(),public.push_public_config() to anon,authenticated,service_role;

create function private.dispatch_push() returns bigint language plpgsql security definer set search_path='' as $$
declare config jsonb;request_id bigint;begin
 config=private.push_server_config();if config->>'birge_push_cron' is null or config->>'birge_project_url' is null then return null;end if;
 select net.http_post(url:=(config->>'birge_project_url')||'/functions/v1/push-dispatch',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(config->>'birge_push_cron')),body:='{}'::jsonb,timeout_milliseconds:=15000) into request_id;
 return request_id;
end $$;
revoke all on function private.dispatch_push() from public,anon,authenticated;

-- Tag notices from the existing guarded commands, without duplicating events.
create function private.tag_notice_category() returns trigger language plpgsql set search_path='' as $$begin
 if new.source_key is null then new.source_key=(case when lower(new.title)~'оплат|чек|платёж' then 'payment:' when lower(new.title)~'задан|назначен|материал|дневник' then 'assignment:' when lower(new.title)~'сообщен|ответ|ветк' then 'message:' else 'appointment:' end)||new.id::text;end if;
 return new;
end $$;
revoke all on function private.tag_notice_category() from public,anon,authenticated;
create trigger notice_category before insert on public.notifications for each row execute function private.tag_notice_category();

create or replace function public.claim_push_batch() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' and coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' is distinct from 'service_role' then raise exception 'auth';end if;
 insert into private.push_deliveries(notification_id,subscription_id)
 select n.id,s.id from public.notifications n join public.push_subscriptions s on s.user_id=n.parent_id
 where not n.read and n.created_at>now()-interval '24 hours' and n.created_at>=s.updated_at
 and not exists(select 1 from public.notification_preferences p where p.user_id=n.parent_id and case when n.source_key like '%payment%' then not p.payments when n.source_key like '%assignment%' or n.source_key like '%task%' then not p.assignments when n.source_key like '%message%' or n.source_key like '%question%' then not p.messages else not p.appointments end) on conflict do nothing;
 with candidates as(select d.notification_id,d.subscription_id from private.push_deliveries d join public.notifications n on n.id=d.notification_id join public.push_subscriptions s on s.id=d.subscription_id and s.user_id=n.parent_id
 where d.sent_at is null and d.attempts<5 and not n.read and n.created_at>=s.updated_at and (d.lease_until is null or d.lease_until<now())
 and not exists(select 1 from public.notification_preferences p where p.user_id=n.parent_id and case when n.source_key like '%payment%' then not p.payments when n.source_key like '%assignment%' or n.source_key like '%task%' then not p.assignments when n.source_key like '%message%' or n.source_key like '%question%' then not p.messages else not p.appointments end)
 order by n.created_at limit 50 for update of d skip locked),claimed as(update private.push_deliveries d set attempts=d.attempts+1,lease_until=now()+interval '5 minutes' from candidates c where d.notification_id=c.notification_id and d.subscription_id=c.subscription_id returning d.*)
 select coalesce(jsonb_agg(jsonb_build_object('notification_id',c.notification_id,'subscription_id',s.id,'endpoint',s.endpoint,'keys',jsonb_build_object('p256dh',s.p256dh,'auth',s.auth))),'[]'::jsonb) into result from claimed c join public.push_subscriptions s on s.id=c.subscription_id;
 return result;
end $$;
