begin;
-- Isolated synthetic family; all fixture changes roll back. Existing demo families are untouched.
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values('f6200000-0000-4000-8000-000000000001','payment-holds@example.invalid',now(),'{"is_demo":true}');
insert into public.user_roles(user_id,role) values('f6200000-0000-4000-8000-000000000001','parent') on conflict(user_id) do nothing;
insert into public.children(id,parent_id,label,age,city,district,experience,budget,format,concerns) values('f6210000-0000-4000-8000-000000000001','f6200000-0000-4000-8000-000000000001','QA · демо','2–3','Алматы','Бостандыкский','first',20000,'any',array['speech']);

create temp table payment_test(k text primary key,v text);
grant all on payment_test to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f6200000-0000-4000-8000-000000000001","role":"authenticated","email":"parent@birge.example"}',true);
do $$declare s record;result jsonb;i integer=0;blocked boolean=false;begin
 for s in select id from public.schedule_slots where specialist_id='00000000-0000-4000-8000-000000000001' and available and price>0 and starts_at>now()+interval '4 days' and not exists(select 1 from public.appointments a where a.child_id='f6210000-0000-4000-8000-000000000001' and a.status in ('pending','confirmed','rescheduled','attended','completed') and a.starts_at<schedule_slots.ends_at and a.ends_at>schedule_slots.starts_at) order by starts_at limit 3 loop
  i=i+1;
  if i<=2 then
   result=public.care_book_slot(jsonb_build_object('slot_id',s.id,'child_id','f6210000-0000-4000-8000-000000000001','reason','Оплата · тест','contact','parent@birge.example'));
   insert into payment_test values('appointment'||i,result->>'id'),('slot'||i,s.id::text);
   if result->>'payment_state'<>'awaiting_payment' then raise exception 'No payment hold';end if;
  else
   begin perform public.care_book_slot(jsonb_build_object('slot_id',s.id,'child_id','f6210000-0000-4000-8000-000000000001','reason','Третья бронь · тест','contact','parent@birge.example'));exception when others then blocked=true;end;
   if not blocked then raise exception 'Third unpaid hold accepted';end if;
  end if;
 end loop;
 if i<>3 then raise exception 'Missing test slots';end if;
 blocked=false;begin perform public.care_command('payment_claim',jsonb_build_object('appointment_id',(select v from payment_test where k='appointment1'),'receipt_path','other-user/file.pdf'));exception when others then blocked=true;end;
 if not blocked then raise exception 'Foreign receipt accepted';end if;
end$$;
reset role;
-- Synthetic storage object only; no real receipt file is uploaded or persisted.
insert into storage.objects(bucket_id,name,metadata) values('booking-receipts','f6200000-0000-4000-8000-000000000001/test-receipt.pdf','{"mimetype":"application/pdf","size":128}');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f6200000-0000-4000-8000-000000000001","role":"authenticated","email":"parent@birge.example"}',true);
select public.care_command('payment_claim',jsonb_build_object('appointment_id',(select v from payment_test where k='appointment1'),'receipt_path','f6200000-0000-4000-8000-000000000001/test-receipt.pdf'));
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated","email":"specialist@birge.example"}',true);
do $$declare blocked boolean=false;begin
 begin perform public.care_command('confirm',jsonb_build_object('appointment_id',(select v from payment_test where k='appointment2')));exception when others then blocked=true;end;
 if not blocked then raise exception 'Unpaid confirmation bypass';end if;
 perform public.care_command('payment_extend',jsonb_build_object('appointment_id',(select v from payment_test where k='appointment2'),'deadline',now()+interval '25 hours'));
 if not private.can_read_payment_receipt('f6200000-0000-4000-8000-000000000001/test-receipt.pdf') then raise exception 'Assigned provider cannot read receipt';end if;
end$$;
reset role;
-- A reported payment never expires; lateness affects reliability once.
update private.booking_payments set deadline=now()-interval '1 minute',claimed_at=now()-interval '13 hours' where appointment_id=(select v::uuid from payment_test where k='appointment1');
update private.booking_payments set deadline=now()-interval '1 minute' where appointment_id=(select v::uuid from payment_test where k='appointment2');
select private.process_booking_deadlines();
select private.process_booking_deadlines();
do $$begin
 if not exists(select 1 from private.booking_payments where appointment_id=(select v::uuid from payment_test where k='appointment1') and state='payment_reported' and overdue_at is not null) then raise exception 'Claimed payment was not frozen';end if;
 if (select count(*) from private.provider_reliability_events where appointment_id=(select v::uuid from payment_test where k='appointment1'))<>1 then raise exception 'Reliability penalized more than once';end if;
 if not exists(select 1 from public.appointments where id=(select v::uuid from payment_test where k='appointment2') and status='expired') then raise exception 'Unpaid hold not expired';end if;
 if not exists(select 1 from public.schedule_slots where id=(select v::uuid from payment_test where k='slot2') and available) then raise exception 'Expired slot still blocked';end if;
end$$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated","email":"specialist@birge.example"}',true);
select public.care_command('payment_confirm',jsonb_build_object('appointment_id',(select v from payment_test where k='appointment1'),'received',true));
select set_config('request.jwt.claims','{"sub":"f6200000-0000-4000-8000-000000000001","role":"authenticated","email":"parent@birge.example"}',true);
do $$declare result jsonb;begin
 result=public.care_book_slot(jsonb_build_object('slot_id',(select v from payment_test where k='slot2'),'child_id','f6210000-0000-4000-8000-000000000001','reason','Повторная бронь · тест','contact','parent@birge.example'));
 if result->>'id'=(select v from payment_test where k='appointment2') then raise exception 'Old expired booking reused';end if;
 if not exists(select 1 from jsonb_array_elements(public.care_snapshot()->'appointments') a where a->>'id'=(select v from payment_test where k='appointment1') and a->>'status'='confirmed' and a->>'payment_state'='confirmed') then raise exception 'Parent confirmation not synchronized';end if;
end$$;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000003","role":"authenticated","email":"clinic@birge.example"}',true);
do $$begin
 if private.can_read_payment_receipt('f6200000-0000-4000-8000-000000000001/test-receipt.pdf') then raise exception 'Clinic received bank receipt';end if;
 if public.care_snapshot()::text like '%test-receipt.pdf%' then raise exception 'Private receipt path leaked';end if;
end$$;
select 'PASS: hold limit, receipt ownership, frozen payment, single reliability penalty, expiry release/rebooking, provider confirmation, clinic privacy' as result;
rollback;
