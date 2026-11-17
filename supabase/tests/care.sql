-- Atomic cross-role integration and negative authorization checks. Entire suite rolls back.
begin;
create temp table care_test_context(k text primary key,v text);
grant all on care_test_context to authenticated;
insert into care_test_context values('slot',(select id::text from public.schedule_slots where specialist_id='00000000-0000-4000-8000-000000000001' and available and starts_at>now() order by starts_at limit 1));
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated","email":"parent@birge.example"}',true);
do $$declare result jsonb;blocked boolean=false;begin
 if jsonb_array_length(public.care_snapshot()->'materials')<>0 then raise exception 'unassigned library exposed';end if;
 begin insert into public.user_roles(user_id,role) values(auth.uid(),'admin');exception when insufficient_privilege then blocked=true;end;
 if not blocked then raise exception 'role escalation possible';end if;
 result=public.care_command('book',jsonb_build_object('slot_id',(select v from care_test_context where k='slot'),'child_id','10000000-0000-4000-8000-000000000001','reason','Тестовый запрос о коммуникации','contact','parent@birge.example','share_diary',true));
 insert into care_test_context values('appointment',result->>'id');
 blocked=false;begin perform public.care_command('book',jsonb_build_object('slot_id',(select v from care_test_context where k='slot'),'child_id','10000000-0000-4000-8000-000000000001'));exception when others then blocked=true;end;
 if not blocked then raise exception 'double booking allowed';end if;
 blocked=false;begin perform public.care_command('review',jsonb_build_object('appointment_id',result->>'id','contact',5,'body','Отзыв без посещения'));exception when others then blocked=true;end;
 if not blocked then raise exception 'unverified review accepted';end if;
 blocked=false;begin perform public.care_command('confirm',jsonb_build_object('appointment_id',result->>'id'));exception when others then blocked=true;end;
 if not blocked then raise exception 'parent confirmed provider booking';end if;
end$$;
-- Stranger cannot inspect the child or mutate an appointment by changing an ID.
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000099","role":"authenticated"}',true);
do $$declare blocked boolean=false;begin
 if exists(select 1 from public.children) then raise exception 'other family leaked';end if;
 begin perform public.care_command('cancel',jsonb_build_object('appointment_id',(select v from care_test_context where k='appointment')));exception when others then blocked=true;end;
 if not blocked then raise exception 'IDOR cancellation possible';end if;
end$$;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated","email":"specialist@birge.example"}',true);
do $$declare result jsonb;begin
 if jsonb_array_length(public.care_snapshot()->'patients')<>0 then raise exception 'patient visible before confirmation';end if;
 perform public.care_command('payment_confirm',jsonb_build_object('received',true,'appointment_id',(select v from care_test_context where k='appointment')));
 if jsonb_array_length(public.care_snapshot()->'patients')<>1 then raise exception 'consented patient missing';end if;
 result=public.care_command('issue_code',jsonb_build_object('appointment_id',(select v from care_test_context where k='appointment')));
 insert into care_test_context values('code',result->>'code');
 perform public.care_command('assign','{"child_id":"10000000-0000-4000-8000-000000000001","material_id":"40000000-0000-4000-8000-000000000001","duration":3,"frequency":"3 раза в неделю","due_at":"2027-01-01","goal_title":"Тестовая цель"}');
 insert into care_test_context values('assignment',(select (public.care_snapshot()->'assignments'->0->>'id')));
end$$;
-- Clinic receives only the organizational projection.
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000003","role":"authenticated","email":"clinic@birge.example"}',true);
do $$declare result jsonb;blocked boolean=false;begin
 result=public.care_snapshot();
 if jsonb_array_length(result->'appointments')<>1 then raise exception 'clinic schedule missing';end if;
 if result->'appointments'->0 ? 'child_id' or result->'appointments'->0 ? 'diagnosis' or result->'appointments'->0 ? 'reason' or exists(select 1 from public.children) then raise exception 'clinic clinical data leak';end if;
 begin perform public.care_command('issue_code',jsonb_build_object('appointment_id',(select v from care_test_context where k='appointment')));exception when others then blocked=true;end;
 if not blocked then raise exception 'clinic issued attendance code';end if;
end$$;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated","email":"parent@birge.example"}',true);
do $$declare result jsonb;blocked boolean=false;begin
 result=public.care_command('redeem_code',jsonb_build_object('appointment_id',(select v from care_test_context where k='appointment'),'code','bad'));
 if result->>'error' is null then raise exception 'invalid code accepted';end if;
 perform public.care_command('redeem_code',jsonb_build_object('appointment_id',(select v from care_test_context where k='appointment'),'code',(select v from care_test_context where k='code')));
 begin perform public.care_command('redeem_code',jsonb_build_object('appointment_id',(select v from care_test_context where k='appointment'),'code',(select v from care_test_context where k='code')));exception when others then blocked=true;end;
 if not blocked then raise exception 'code reused';end if;
 perform public.care_command('review',jsonb_build_object('appointment_id',(select v from care_test_context where k='appointment'),'contact',5,'adaptation','yes','explained',true,'goal',true,'comfortable',true,'body','Только тестовые ответы, без выдуманных результатов.','strengths',jsonb_build_array('Хороший контакт с ребёнком')));
 blocked=false;begin perform public.care_command('review',jsonb_build_object('appointment_id',(select v from care_test_context where k='appointment'),'contact',5,'body','Второй отзыв на тот же приём'));exception when unique_violation then blocked=true;end;
 if not blocked then raise exception 'duplicate review allowed';end if;
 perform public.care_command('complete',jsonb_build_object('assignment_id',(select v from care_test_context where k='assignment'),'outcome','partial','comment','Тестовый комментарий'));
 result=public.care_command('share',jsonb_build_object('assignment_id',(select v from care_test_context where k='assignment')));
 insert into care_test_context values('token',result->>'token');
 result=public.family_task(result->>'token');
 if result ? 'child_id' or result ? 'parent_id' or result ? 'diagnosis' or result ? 'comment' or result ? 'goal_title' then raise exception 'family link leaks private data';end if;
 perform public.care_command('revoke_share',jsonb_build_object('assignment_id',(select v from care_test_context where k='assignment')));
 if public.family_task((select v from care_test_context where k='token')) is not null then raise exception 'revoked link still works';end if;
 perform public.care_command('consent',jsonb_build_object('appointment_id',(select v from care_test_context where k='appointment'),'enabled',false));
end$$;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated","email":"specialist@birge.example"}',true);
do $$begin if jsonb_array_length(public.care_snapshot()->'patients')<>0 or jsonb_array_length(public.care_snapshot()->'assignments')<>0 then raise exception 'revoked consent not enforced';end if;end$$;
reset role;
-- Direct overlapping inserts cannot bypass the exclusion constraint even as a privileged writer.
do $$declare blocked boolean=false; a public.appointments;begin
 select * into a from public.appointments where id=(select v::uuid from care_test_context where k='appointment');
 begin insert into public.appointments(parent_id,child_id,specialist_id,slot_id,starts_at,ends_at,status,reason,contact) values(a.parent_id,a.child_id,a.specialist_id,a.slot_id,a.starts_at+interval '1 minute',a.ends_at,'pending',a.reason,a.contact);exception when exclusion_violation then blocked=true;end;
 if not blocked then raise exception 'database overlap constraint missing';end if;
end$$;
select 'PASS: cross-role booking, privacy, consent, reviews, codes, tasks, family links, database overlap protection' as result;
-- Account deletion must also work with linked visits, goals, tasks and completions.
select set_config('request.jwt.claims','{}',true);
delete from auth.users where id='20000000-0000-4000-8000-000000000001';
delete from auth.users where id='20000000-0000-4000-8000-000000000002';
delete from auth.users where id='20000000-0000-4000-8000-000000000003';
rollback;
