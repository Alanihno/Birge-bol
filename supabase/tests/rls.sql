-- Transactional synthetic identities; always rolled back. Run as postgres in SQL Editor/MCP.
begin;
insert into auth.users(id,email) values('f0000000-0000-4000-8000-000000000001','rls-a@example.invalid'),('f0000000-0000-4000-8000-000000000002','rls-b@example.invalid');
insert into public.children(id,parent_id,label,age,city,district,experience,budget,format) values
('f1000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000001','A · демо','2–3','Астана','Есиль','first',20000,'any'),
('f1000000-0000-4000-8000-000000000002','f0000000-0000-4000-8000-000000000002','B · демо','2–3','Астана','Есиль','first',20000,'any');
set local role authenticated;
set local request.jwt.claims='{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated"}';
do $$ declare n integer;begin
 select count(*) into n from public.children;
 if n<>1 then raise exception 'FAIL: cross-family read';end if;
 update public.children set label='attack' where id='f1000000-0000-4000-8000-000000000002';
 get diagnostics n=row_count;if n<>0 then raise exception 'FAIL: cross-family update';end if;
 begin insert into public.user_roles(user_id,role) values(auth.uid(),'admin');raise exception 'FAIL: role escalation';exception when insufficient_privilege then null;end;
 begin insert into public.child_goals(parent_id,child_id,title,metric,target,due_at) values(auth.uid(),'f1000000-0000-4000-8000-000000000002','Cross family goal','attempts',5,current_date);raise exception 'FAIL: cross-family goal';exception when foreign_key_violation then null;end;
 begin insert into public.questions(parent_id,title,body,topic,status) values(auth.uid(),'Bypass moderation','Long enough example text for testing','Речь','open');raise exception 'FAIL: moderation bypass';exception when insufficient_privilege then null;end;
 if private.is_staff() then raise exception 'FAIL: staff privileges';end if;
end $$;
select 'PASS: A sees own child only; cannot update B, reference B, self-assign admin, or bypass moderation' as result;
set local request.jwt.claims='{"sub":"f0000000-0000-4000-8000-000000000002","role":"authenticated"}';
do $$ begin if (select count(*) from public.children)<>1 or not exists(select 1 from public.children where label='B · демо') then raise exception 'FAIL: B isolation';end if;end $$;
select 'PASS: B sees own child only' as result;
set local role anon;
set local request.jwt.claims='{"role":"anon"}';
do $$ begin begin perform * from public.children;raise exception 'FAIL: anonymous child access';exception when insufficient_privilege then null;end;end $$;
select 'PASS: anonymous access to children denied' as result;
rollback;
