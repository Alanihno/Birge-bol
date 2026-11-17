-- Verify the real RPC/RLS path without changing any existing appointment.
begin;
create temp table chain_context (id uuid);
grant all on chain_context to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated","email":"parent@birge.example"}',true);
do $$declare result jsonb;begin
 result=public.care_command('book',jsonb_build_object('slot_id',(select id from public.schedule_slots where specialist_id='00000000-0000-4000-8000-000000000001' and available and starts_at>now() and not exists(select 1 from public.appointments a where a.child_id='10000000-0000-4000-8000-000000000001' and a.status<>'cancelled' and a.starts_at<schedule_slots.ends_at and a.ends_at>schedule_slots.starts_at) order by starts_at limit 1),'child_id','10000000-0000-4000-8000-000000000001','reason','Проверка цепочки · демо','contact','parent@birge.example','share_diary',true));
 insert into chain_context values((result->>'id')::uuid);
end$$;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated","email":"specialist@birge.example"}',true);
do $$begin
 if not exists(select 1 from jsonb_array_elements(public.care_snapshot()->'appointments') a where a->>'id'=(select id::text from chain_context) and a->>'status'='pending') then raise exception 'Request did not reach Aigerim';end if;
 if not exists(select 1 from public.notifications where parent_id=auth.uid() and title='Новая заявка на приём') then raise exception 'Provider notification missing';end if;
 perform public.care_command('payment_confirm',jsonb_build_object('received',true,'appointment_id',(select id from chain_context)));
end$$;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated","email":"parent@birge.example"}',true);
do $$begin
 if not exists(select 1 from jsonb_array_elements(public.care_snapshot()->'appointments') a where a->>'id'=(select id::text from chain_context) and a->>'status'='confirmed') then raise exception 'Confirmation did not reach parent';end if;
 if not exists(select 1 from public.notifications where parent_id=auth.uid() and title like 'Запись подтверждена%') then raise exception 'Parent notification missing';end if;
end$$;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000003","role":"authenticated","email":"clinic@birge.example"}',true);
do $$declare item jsonb;begin
 select a into item from jsonb_array_elements(public.care_snapshot()->'appointments') a where a->>'id'=(select id::text from chain_context);
 if item is null or item->>'status'<>'confirmed' or item ? 'child_id' or item ? 'reason' then raise exception 'Clinic schedule missing or private data exposed';end if;
end$$;
select 'PASS: parent request -> Aigerim account -> parent confirmation -> safe clinic schedule' as result;
rollback;
