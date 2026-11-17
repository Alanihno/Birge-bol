-- No API key is stored in migrations or application source.
create table private.ai_settings(singleton boolean primary key default true check(singleton),enabled boolean not null default false,model text not null default 'gemini-2.5-flash' check(model ~ '^[a-zA-Z0-9.-]+$'),daily_limit integer not null default 20 check(daily_limit between 1 and 100));
insert into private.ai_settings(singleton) values(true);
create table private.ai_daily_usage(day date primary key,hits integer not null default 0 check(hits>=0));
alter table private.ai_settings enable row level security;
alter table private.ai_daily_usage enable row level security;
create policy no_client_settings on private.ai_settings for all to anon,authenticated using(false) with check(false);
create policy no_client_usage on private.ai_daily_usage for all to anon,authenticated using(false) with check(false);
revoke all on private.ai_settings,private.ai_daily_usage from public,anon,authenticated;
revoke all on vault.secrets,vault.decrypted_secrets from anon,authenticated;

-- Internal service-only operations require the signed backend role, never user_metadata.
create function private.gemini_runtime_config() returns jsonb language plpgsql security definer set search_path='' as $$ declare settings private.ai_settings;api_key text;begin
 if coalesce(current_setting('request.jwt.claims',true)::jsonb->>'role','')<>'service_role' then raise insufficient_privilege;end if;
 select * into settings from private.ai_settings where singleton;
 if not settings.enabled then return null;end if;
 select decrypted_secret into api_key from vault.decrypted_secrets where name='birge_bol_gemini_api_key';
 if api_key is null then return null;end if;
 return jsonb_build_object('key',api_key,'model',settings.model);end $$;
create function private.reserve_gemini_budget() returns boolean language plpgsql security definer set search_path='' as $$ declare current_hits integer;budget integer;begin
 if coalesce(current_setting('request.jwt.claims',true)::jsonb->>'role','')<>'service_role' then raise insufficient_privilege;end if;
 select daily_limit into budget from private.ai_settings where singleton and enabled;
 if budget is null then return false;end if;
 insert into private.ai_daily_usage(day,hits) values((now() at time zone 'UTC')::date,1) on conflict(day) do update set hits=private.ai_daily_usage.hits+1 returning hits into current_hits;
 return current_hits<=budget;end $$;
revoke all on function private.gemini_runtime_config(),private.reserve_gemini_budget() from public,anon,authenticated;
grant execute on function private.gemini_runtime_config(),private.reserve_gemini_budget() to service_role;
create function public.gemini_runtime_config() returns jsonb language sql security invoker set search_path='' as $$ select private.gemini_runtime_config() $$;
create function public.reserve_gemini_budget() returns boolean language sql security invoker set search_path='' as $$ select private.reserve_gemini_budget() $$;
revoke all on function public.gemini_runtime_config(),public.reserve_gemini_budget() from public,anon,authenticated;
grant execute on function public.gemini_runtime_config(),public.reserve_gemini_budget() to service_role;
