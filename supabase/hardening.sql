grant update(child_id) on public.child_goals to authenticated;
alter function public.consume_function_quota(text) set schema private;
create function public.consume_function_quota(p_bucket text) returns boolean language sql security invoker set search_path='' as $$ select private.consume_function_quota(p_bucket) $$;
revoke all on function public.consume_function_quota(text) from public,anon;
grant execute on function public.consume_function_quota(text) to authenticated;
create policy deny_direct_quota on private.rate_limits for all to authenticated using(false) with check(false);
create policy deny_direct_events on private.telegram_events for all to authenticated using(false) with check(false);
create function private.notify_on_answer() returns trigger language plpgsql security definer set search_path='' as $$ declare owner_id uuid;begin
 if new.approved and (tg_op='INSERT' or not old.approved) then
 select parent_id into owner_id from public.questions where id=new.question_id;
 if owner_id is not null then insert into public.notifications(parent_id,title,"to") values(owner_id,'На ваш вопрос добавлен ответ','/moms/questions/'||new.question_id);end if;
 end if;return new;end $$;
revoke all on function private.notify_on_answer() from public,anon,authenticated;
create trigger notify_on_answer after insert or update on public.answers for each row execute function private.notify_on_answer();
create function public.claim_telegram_event(p_update_id bigint) returns boolean language plpgsql security invoker set search_path='' as $$ declare n integer;begin
 insert into private.telegram_events(update_id) values(p_update_id) on conflict do nothing;
 get diagnostics n=row_count;return n=1;end $$;
revoke all on function public.claim_telegram_event(bigint) from public,anon,authenticated;
grant execute on function public.claim_telegram_event(bigint) to service_role;
grant usage on schema private to service_role;
grant select,insert on private.telegram_events to service_role;
-- Public anonymous review reads exclude ownership and verification evidence.
revoke select on public.reviews from anon;
grant select(id,specialist_id,body,contact,status,is_demo,created_at) on public.reviews to anon;
