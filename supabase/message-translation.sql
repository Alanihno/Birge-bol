create table public.message_translations(
 message_id uuid not null references public.care_messages(id) on delete cascade,
 target_language text not null check(target_language in ('ru','kk')),
 source_hash text not null,translated_text text not null check(length(translated_text) between 1 and 6000),
 created_at timestamptz not null default now(),primary key(message_id,target_language));
alter table public.message_translations enable row level security;
revoke all on public.message_translations from public,anon,authenticated;
grant select on public.message_translations to authenticated;
grant all on public.message_translations to service_role;
create policy translation_message_read on public.message_translations for select to authenticated using(exists(select 1 from public.care_messages m where m.id=message_id));
create table private.translation_quotas(user_id uuid not null references auth.users(id) on delete cascade,hour_at timestamptz not null,hits integer not null,primary key(user_id,hour_at));
alter table private.translation_quotas enable row level security;
revoke all on private.translation_quotas from public,anon,authenticated;
create policy no_translation_quota_client on private.translation_quotas for all to anon,authenticated using(false) with check(false);
create function private.translation_quota(p_user_id uuid) returns boolean language plpgsql security definer set search_path='' as $$declare n int;begin
 if coalesce(current_setting('request.jwt.claims',true)::jsonb->>'role','')<>'service_role' then raise insufficient_privilege;end if;
 insert into private.translation_quotas(user_id,hour_at,hits) values(p_user_id,date_trunc('hour',now()),1) on conflict(user_id,hour_at) do update set hits=private.translation_quotas.hits+1 returning hits into n;
 delete from private.translation_quotas where hour_at<now()-interval '2 days';return n<=30;
end $$;
revoke all on function private.translation_quota(uuid) from public,anon,authenticated;
grant execute on function private.translation_quota(uuid) to service_role;
create function public.care_translation_quota(p_user_id uuid) returns boolean language sql security invoker set search_path='' as $$select private.translation_quota(p_user_id)$$;
revoke all on function public.care_translation_quota(uuid) from public,anon,authenticated;
grant execute on function public.care_translation_quota(uuid) to service_role;
