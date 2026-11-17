create function private.guard_verified_visit_time() returns trigger language plpgsql set search_path='' as $$begin
 if (not old.visit_verified and new.visit_verified) or (old.status='confirmed' and new.status='attended') then
  if clock_timestamp() not between new.starts_at-interval '30 minutes' and coalesce(new.ends_at,new.starts_at+interval '45 minutes')+interval '2 hours' then raise exception 'Подтверждение посещения доступно за 30 минут до приёма и до 2 часов после окончания';end if;
 end if;
 if not old.visit_verified and new.visit_verified then new.visited_at=coalesce(new.visited_at,clock_timestamp());end if;
 return new;
end$$;
revoke all on function private.guard_verified_visit_time() from public,anon,authenticated;
create trigger guard_verified_visit_time before update on public.appointments for each row execute function private.guard_verified_visit_time();
do $$declare definition text;begin
 select pg_get_functiondef('private.confirm_qr(text,uuid)'::regprocedure) into definition;
 definition=replace(definition,'b.status=''confirmed''','b.status in (''confirmed'',''attended'')');
 definition=replace(definition,'and status=''confirmed'' and not visit_verified for update','and status in (''confirmed'',''attended'') and not visit_verified for update');
 execute definition;
end$$;
