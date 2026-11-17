begin;
insert into auth.users(id,email,email_confirmed_at) values('f5000000-0000-4000-8000-000000000001','p5-a@example.invalid',now()),('f5000000-0000-4000-8000-000000000002','p5-b@example.invalid',now());
set local role authenticated;
set local request.jwt.claims='{"sub":"f5000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into public.consent_events(user_id,kind,document_version,granted) values(auth.uid(),'platform','2026-11-17.draft.1',true);
select public.register_push_device('https://fcm.googleapis.com/fcm/send/prompt5-test',repeat('A',87),repeat('B',22));
do $$begin
 if (select count(*) from public.push_subscriptions where user_id=auth.uid())<>1 then raise exception 'FAIL: subscription missing';end if;
 begin perform public.claim_push_batch();raise exception 'FAIL: user can dispatch';exception when insufficient_privilege then null;end;
 begin insert into public.consent_events(user_id,kind,document_version,granted) values('f5000000-0000-4000-8000-000000000002','platform','2026-11-17.draft.1',true);raise exception 'FAIL: cross-account consent';exception when insufficient_privilege then null;end;
 begin perform public.register_push_device('https://127.0.0.1/ssrf',repeat('A',87),repeat('B',22));raise exception 'FAIL: unsafe endpoint';exception when raise_exception then if SQLERRM<>'body' then raise;end if;end;
end $$;
set local request.jwt.claims='{"sub":"f5000000-0000-4000-8000-000000000002","role":"authenticated"}';
do $$begin
 if exists(select 1 from public.push_subscriptions) or exists(select 1 from public.consent_events) then raise exception 'FAIL: cross-account reads';end if;
end $$;
select public.register_push_device('https://fcm.googleapis.com/fcm/send/prompt5-test',repeat('A',87),repeat('B',22));
set local request.jwt.claims='{"sub":"f5000000-0000-4000-8000-000000000001","role":"authenticated"}';
do $$begin if exists(select 1 from public.push_subscriptions) then raise exception 'FAIL: device still belongs to previous user';end if;end $$;
set local role anon;
set local request.jwt.claims='{"role":"anon"}';
do $$begin begin perform public.register_push_device('https://fcm.googleapis.com/fcm/send/prompt5-test',repeat('A',87),repeat('B',22));raise exception 'FAIL: anonymous registration';exception when insufficient_privilege then null;end;end $$;
select 'PASS: isolated consents and devices, endpoint allowlist, dispatch denied to users, anonymous denied, atomic reassignment' as result;
rollback;
