-- Synthetic devices and accounts only; never contacts a push service, always rolls back.
begin;
insert into auth.users(id,email,email_confirmed_at) values('f6300000-0000-4000-8000-000000000001','push-qa-a@example.invalid',now()),('f6300000-0000-4000-8000-000000000002','push-qa-b@example.invalid',now());
insert into public.push_subscriptions(id,user_id,endpoint,p256dh,auth,updated_at) values('f6310000-0000-4000-8000-000000000001','f6300000-0000-4000-8000-000000000001','https://fcm.googleapis.com/fcm/send/qa-delivery-rollback',repeat('A',87),repeat('B',22),now()-interval '1 hour');
insert into public.notifications(id,parent_id,title,"to",source_key) values('f6320000-0000-4000-8000-000000000001','f6300000-0000-4000-8000-000000000001','Новая заявка на приём','/notifications','qa:appointment'),('f6320000-0000-4000-8000-000000000002','f6300000-0000-4000-8000-000000000001','Новое сообщение по приёму','/notifications','qa:thread');
insert into public.notification_preferences(user_id,messages) values('f6300000-0000-4000-8000-000000000001',false);
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$declare batch jsonb;begin
 batch=public.claim_push_batch();
 if not exists(select 1 from jsonb_array_elements(batch) x where x->>'notification_id'='f6320000-0000-4000-8000-000000000001') then raise exception 'Booking not queued';end if;
 if exists(select 1 from jsonb_array_elements(batch) x where x->>'notification_id'='f6320000-0000-4000-8000-000000000002') then raise exception 'Message preference ignored';end if;
 batch=public.claim_push_batch();
 if exists(select 1 from jsonb_array_elements(batch) x where x->>'notification_id'='f6320000-0000-4000-8000-000000000001') then raise exception 'Duplicate lease';end if;
 perform public.finish_push_delivery('f6320000-0000-4000-8000-000000000001','f6310000-0000-4000-8000-000000000001',503);
 if not exists(select 1 from private.push_deliveries where notification_id='f6320000-0000-4000-8000-000000000001' and sent_at is null and last_code=503 and lease_until>now()) then raise exception 'Failed push falsely marked delivered';end if;
end$$;
update private.push_deliveries set lease_until=now()-interval '1 minute' where notification_id='f6320000-0000-4000-8000-000000000001';
update public.notification_preferences set appointments=false where user_id='f6300000-0000-4000-8000-000000000001';
do $$declare batch jsonb;begin
 batch=public.claim_push_batch();if exists(select 1 from jsonb_array_elements(batch) x where x->>'notification_id'='f6320000-0000-4000-8000-000000000001') then raise exception 'Changed preference ignored on retry';end if;
end$$;
update public.notification_preferences set appointments=true where user_id='f6300000-0000-4000-8000-000000000001';
update public.push_subscriptions set user_id='f6300000-0000-4000-8000-000000000002' where id='f6310000-0000-4000-8000-000000000001';
do $$declare batch jsonb;begin
 batch=public.claim_push_batch();if exists(select 1 from jsonb_array_elements(batch) x where x->>'notification_id'='f6320000-0000-4000-8000-000000000001') then raise exception 'Previous account push leaked to reassigned device';end if;
 perform public.finish_push_delivery('f6320000-0000-4000-8000-000000000001','f6310000-0000-4000-8000-000000000001',410);
 if exists(select 1 from public.push_subscriptions where id='f6310000-0000-4000-8000-000000000001') then raise exception 'Expired subscription not removed';end if;
end$$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f6300000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$begin
 if exists(select 1 from public.notifications where parent_id='f6300000-0000-4000-8000-000000000001') then raise exception 'Foreign inbox visible';end if;
 if has_function_privilege('authenticated','public.push_server_config()','execute') or has_function_privilege('authenticated','public.claim_identity_recovery(text,text)','execute') then raise exception 'Server credential RPC exposed';end if;
end$$;
select 'PASS: queue, leases, retry, preferences, device reassignment, expiry, inbox and server-RPC isolation' as result;
rollback;
