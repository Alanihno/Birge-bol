-- Keep the privileged implementation outside the exposed API schema.
alter function public.register_push_device(text,text,text) set schema private;
create function public.register_push_device(p_endpoint text,p_p256dh text,p_auth text) returns void
language sql security invoker set search_path='' as $$select private.register_push_device(p_endpoint,p_p256dh,p_auth)$$;
revoke all on function public.register_push_device(text,text,text) from public,anon;
grant execute on function public.register_push_device(text,text,text) to authenticated;
create policy deny_client_push_delivery on private.push_deliveries for all to authenticated using(false) with check(false);
create policy deny_client_ai_metrics on private.ai_metrics for all to authenticated using(false) with check(false);
comment on function private.register_push_device(text,text,text) is 'Intentionally privileged atomic device reassignment; authenticated owner, confirmed email, endpoint allowlist, per-user quota.';

create or replace function public.schedule_notification_reminders() returns integer language plpgsql security definer set search_path='' as $$
declare affected integer;assignments_count integer;
begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' and coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' is distinct from 'service_role' then raise exception 'auth';end if;
 insert into public.notifications(parent_id,title,"to",source_key)
 select parent_id,'Скоро приём в Birge Bol','/diary','reminder:appointment:'||id from public.appointments
 where status='confirmed' and starts_at>now() and starts_at<now()+interval '2 hours'
 on conflict(parent_id,source_key) where source_key is not null do nothing;
 get diagnostics affected=row_count;
 insert into public.notifications(parent_id,title,"to",source_key)
 select parent_id,'Приближается срок назначения в Birge Bol','/diary','reminder:assignment:'||id from public.task_assignments
 where status in ('new','active') and due_at>=(now() at time zone 'Asia/Almaty')::date and due_at<=(now() at time zone 'Asia/Almaty')::date+1
 on conflict(parent_id,source_key) where source_key is not null do nothing;
 get diagnostics assignments_count=row_count;
 return affected+assignments_count;
end $$;
