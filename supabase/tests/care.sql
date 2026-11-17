-- Atomic cross-role integration and negative authorization checks. Entire suite rolls back.
begin;
-- Isolated synthetic family; all fixture changes roll back. Existing demo families are untouched.
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values('f6100000-0000-4000-8000-000000000001','care@example.invalid',now(),'{"is_demo":true}');
insert into public.user_roles(user_id,role) values('f6100000-0000-4000-8000-000000000001','parent') on conflict(user_id) do nothing;
insert into public.children(id,parent_id,label,age,city,district,experience,budget,format,concerns) values('f6110000-0000-4000-8000-000000000001','f6100000-0000-4000-8000-000000000001','QA · демо','2–3','Алматы','Бостандыкский','first',20000,'any',array['speech']);

insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values('f6100000-0000-4000-8000-000000000002','care-provider@example.invalid',now(),'{"is_demo":true}');
insert into public.user_roles(user_id,role) values('f6100000-0000-4000-8000-000000000002','specialist') on conflict(user_id) do nothing;
insert into public.specialists(id,name,specialty,city,district,price,experience,online,concerns,ages,description,color,published,is_demo,verification_status,owner_id) values('f6130000-0000-4000-8000-000000000001','QA · демо','Логопед','Алматы','Бостандыкский',10000,5,false,array['speech'],array['2–3'],'Temporary QA fixture','lilac',true,true,'approved','f6100000-0000-4000-8000-000000000002');
insert into public.clinic_members(clinic_id,specialist_id,status) values('30000000-0000-4000-8000-000000000001','f6130000-0000-4000-8000-000000000001','active');
insert into public.schedule_slots(id,specialist_id,starts_at,ends_at,service,price,available) values('f6120000-0000-4000-8000-000000000001','f6130000-0000-4000-8000-000000000001',now()+interval '5 minutes',now()+interval '50 minutes','QA · демо',10000,true);
create temp table care_test_context(k text primary key,v text);
grant all on care_test_context to authenticated;
insert into care_test_context values('slot','f6120000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f6100000-0000-4000-8000-000000000001","role":"authenticated","email":"parent@birge.example"}',true);
do $$declare result jsonb;blocked boolean=false;begin
 if jsonb_array_length(public.care_snapshot()->'materials')<>0 then raise exception 'unassigned library exposed';end if;
 begin insert into public.user_roles(user_id,role) values(auth.uid(),'admin');exception when insufficient_privilege then blocked=true;end;
 if not blocked then raise exception 'role escalation possible';end if;
 result=public.care_command('book',jsonb_build_object('slot_id',(select v from care_test_context where k='slot'),'child_id','f6110000-0000-4000-8000-000000000001','reason','Тестовый запрос о коммуникации','contact','parent@birge.example','share_diary',true));
 insert into care_test_context values('appointment',result->>'id');
 blocked=false;begin perform public.care_command('book',jsonb_build_object('slot_id',(select v from care_test_context where k='slot'),'child_id','f6110000-0000-4000-8000-000000000001'));exception when others then blocked=true;end;
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
select set_config('request.jwt.claims','{"sub":"f6100000-0000-4000-8000-000000000002","role":"authenticated","email":"specialist@birge.example"}',true);
do $$declare result jsonb;begin
 if exists(select 1 from jsonb_array_elements(public.care_snapshot()->'patients') c where c->>'id'='f6110000-0000-4000-8000-000000000001') then raise exception 'patient visible before confirmation';end if;
 perform public.care_command('payment_confirm',jsonb_build_object('received',true,'appointment_id',(select v from care_test_context where k='appointment')));
 if not exists(select 1 from jsonb_array_elements(public.care_snapshot()->'patients') c where c->>'id'='f6110000-0000-4000-8000-000000000001') then raise exception 'consented patient missing';end if;
 result=public.care_command('issue_code',jsonb_build_object('appointment_id',(select v from care_test_context where k='appointment')));
 insert into care_test_context values('code',result->>'code');
 perform public.care_command('assign','{"child_id":"f6110000-0000-4000-8000-000000000001","material_id":"40000000-0000-4000-8000-000000000001","duration":3,"frequency":"3 раза в неделю","due_at":"2027-01-01","goal_title":"Тестовая цель"}');
 insert into care_test_context values('assignment',(select a->>'id' from jsonb_array_elements(public.care_snapshot()->'assignments') a where a->>'child_id'='f6110000-0000-4000-8000-000000000001' limit 1));
end$$;
-- Clinic receives only the organizational projection.
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000003","role":"authenticated","email":"clinic@birge.example"}',true);
do $$declare result jsonb;blocked boolean=false;begin
 result=public.care_snapshot();
 if not exists(select 1 from jsonb_array_elements(result->'appointments') a where a->>'id'=(select v from care_test_context where k='appointment')) then raise exception 'clinic schedule missing';end if;
 if result->'appointments'->0 ? 'child_id' or result->'appointments'->0 ? 'diagnosis' or result->'appointments'->0 ? 'reason' or exists(select 1 from public.children) then raise exception 'clinic clinical data leak';end if;
 begin perform public.care_command('issue_code',jsonb_build_object('appointment_id',(select v from care_test_context where k='appointment')));exception when others then blocked=true;end;
 if not blocked then raise exception 'clinic issued attendance code';end if;
end$$;
select set_config('request.jwt.claims','{"sub":"f6100000-0000-4000-8000-000000000001","role":"authenticated","email":"parent@birge.example"}',true);
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
 if (select granted from public.consent_events where user_id=auth.uid() and kind='data_share' order by created_at desc limit 1) is distinct from false then raise exception 'revoked consent audit incorrect';end if;
end$$;
select set_config('request.jwt.claims','{"sub":"f6100000-0000-4000-8000-000000000002","role":"authenticated","email":"specialist@birge.example"}',true);
do $$begin if exists(select 1 from jsonb_array_elements(public.care_snapshot()->'patients') c where c->>'id'='f6110000-0000-4000-8000-000000000001') or exists(select 1 from jsonb_array_elements(public.care_snapshot()->'assignments') a where a->>'child_id'='f6110000-0000-4000-8000-000000000001') then raise exception 'revoked consent not enforced';end if;end$$;
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
delete from auth.users where id='f6100000-0000-4000-8000-000000000001';
-- Existing synthetic staff identities are not deleted.
-- Existing synthetic staff identities are not deleted.
rollback;
