begin;
insert into auth.users(id,email) values('f0000000-0000-4000-8000-000000000003','rpc-test@example.invalid');
set local role authenticated;
set local request.jwt.claims='{"sub":"f0000000-0000-4000-8000-000000000003","role":"authenticated"}';
select public.save_synthetic_child('{"id":"f1000000-0000-4000-8000-000000000003","label":"Учебный профиль · демо","age":"2–3","city":"Астана","district":"Есиль","concerns":["speech"],"experience":"first","budget":20000,"format":"any"}');
select public.submit_feedback('f1000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','{"contact":3,"adaptation":"partial","explained":true,"goal":false,"comfortable":true}','Учебный отзыв без результатов и персональных данных.');
do $$ declare allowed boolean;begin
 if (select count(*) from public.children)<>1 or (select count(*) from public.consent_records)<>1 then raise exception 'FAIL: profile and consent';end if;
 if (select count(*) from public.session_feedback)<>1 or not exists(select 1 from public.reviews where status='pending' and is_demo) then raise exception 'FAIL: feedback atomic flow';end if;
 for i in 1..10 loop allowed=public.consume_function_quota('explain');if not allowed then raise exception 'FAIL: premature rate limit';end if;end loop;
 if public.consume_function_quota('explain') then raise exception 'FAIL: quota not enforced';end if;
end $$;
select 'PASS: consent/profile RPC, structured feedback, synthetic pending review and persisted 10/hour quota' as result;
rollback;
