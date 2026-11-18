create function private.rotate_identity_recovery(p_user uuid,p_hash text) returns void language plpgsql security definer set search_path='' as $$begin
 update private.identity_recovery set recovery_hash=p_hash where user_id=p_user and (lease_until is null or lease_until<now());
 if not found then raise exception 'retry';end if;
end $$;
create function public.rotate_identity_recovery(p_user uuid,p_hash text) returns void language sql security invoker set search_path='' as $$select private.rotate_identity_recovery(p_user,p_hash)$$;
revoke all on function private.rotate_identity_recovery(uuid,text),public.rotate_identity_recovery(uuid,text) from public,anon,authenticated;
grant execute on function private.rotate_identity_recovery(uuid,text),public.rotate_identity_recovery(uuid,text) to service_role;
create function private.notice_category(p_source text,p_title text) returns text language sql immutable set search_path='' as $$select case when coalesce(p_source,'')~'payment' then 'payments' when coalesce(p_source,'')~'assignment|task' then 'assignments' when coalesce(p_source,'')~'message|thread|question|support' then 'messages' when lower(p_title)~'оплат|оплач|чек|платёж' then 'payments' when lower(p_title)~'задан|назначен|материал|дневник' then 'assignments' when lower(p_title)~'сообщен|ответ|ветк' then 'messages' else 'appointments' end$$;
revoke all on function private.notice_category(text,text) from public,anon,authenticated;
grant execute on function private.notice_category(text,text) to service_role;
create or replace function public.claim_push_batch() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' and coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' is distinct from 'service_role' then raise exception 'auth';end if;
 insert into private.push_deliveries(notification_id,subscription_id)
 select n.id,s.id from public.notifications n join public.push_subscriptions s on s.user_id=n.parent_id
 where not n.read and n.created_at>now()-interval '24 hours' and n.created_at>=s.updated_at
 and not exists(select 1 from public.notification_preferences p where p.user_id=n.parent_id and case private.notice_category(n.source_key,n.title) when 'payments' then not p.payments when 'assignments' then not p.assignments when 'messages' then not p.messages else not p.appointments end) on conflict do nothing;
 with candidates as(select d.notification_id,d.subscription_id from private.push_deliveries d join public.notifications n on n.id=d.notification_id join public.push_subscriptions s on s.id=d.subscription_id and s.user_id=n.parent_id
 where d.sent_at is null and d.attempts<5 and not n.read and n.created_at>=s.updated_at and (d.lease_until is null or d.lease_until<now())
 and not exists(select 1 from public.notification_preferences p where p.user_id=n.parent_id and case private.notice_category(n.source_key,n.title) when 'payments' then not p.payments when 'assignments' then not p.assignments when 'messages' then not p.messages else not p.appointments end)
 order by n.created_at limit 50 for update of d skip locked),claimed as(update private.push_deliveries d set attempts=d.attempts+1,lease_until=now()+interval '5 minutes' from candidates c where d.notification_id=c.notification_id and d.subscription_id=c.subscription_id returning d.*)
 select coalesce(jsonb_agg(jsonb_build_object('notification_id',c.notification_id,'subscription_id',s.id,'endpoint',s.endpoint,'keys',jsonb_build_object('p256dh',s.p256dh,'auth',s.auth))),'[]'::jsonb) into result from claimed c join public.push_subscriptions s on s.id=c.subscription_id;
 return result;
end $$;
