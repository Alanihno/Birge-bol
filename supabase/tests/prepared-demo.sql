-- Read-only assertions under the actual client role; no fixture resets.
begin;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ declare s jsonb:=public.care_snapshot(); begin
 if (select count(*) from jsonb_array_elements(s->'appointments') a where a->>'payment_state'='payment_reported')<1 then raise exception 'Reported payment missing'; end if;
 if (select count(*) from public.child_goals)<3 then raise exception 'Family reports missing';end if;
 if (select count(*) from public.questions where topic='Новости')<4 then raise exception 'News missing'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ declare s jsonb:=public.care_snapshot();begin
 if jsonb_array_length(s->'patients')<3 then raise exception 'Specialist cannot access synthetic patients'; end if;
 if jsonb_array_length(s->'assignments')<6 then raise exception 'Specialist assignments missing';end if;
end $$;
rollback;
