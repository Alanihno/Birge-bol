create function private.claim_test_push(p_user uuid,p_notice uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 if not exists(select 1 from public.notifications where id=p_notice and parent_id=p_user) then raise exception 'notice';end if;
 insert into private.push_deliveries(notification_id,subscription_id,attempts,lease_until) select p_notice,s.id,1,now()+interval '5 minutes' from public.push_subscriptions s where s.user_id=p_user on conflict do nothing;
 select coalesce(jsonb_agg(jsonb_build_object('notification_id',p_notice,'subscription_id',s.id,'endpoint',s.endpoint,'keys',jsonb_build_object('p256dh',s.p256dh,'auth',s.auth))),'[]'::jsonb) into result from public.push_subscriptions s where s.user_id=p_user;
 return result;
end $$;
create function public.claim_test_push(p_user uuid,p_notice uuid) returns jsonb language sql security invoker set search_path='' as $$select private.claim_test_push(p_user,p_notice)$$;
revoke all on function private.claim_test_push(uuid,uuid),public.claim_test_push(uuid,uuid) from public,anon,authenticated;
grant execute on function private.claim_test_push(uuid,uuid),public.claim_test_push(uuid,uuid) to service_role;
create policy identity_limits_deny on private.identity_limits for all to anon,authenticated using(false) with check(false);
create policy identity_recovery_deny on private.identity_recovery for all to anon,authenticated using(false) with check(false);
