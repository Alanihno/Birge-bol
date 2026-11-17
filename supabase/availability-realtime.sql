-- Publish availability only. Child records and appointment contents remain outside Realtime.
do $$begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='schedule_slots') then
  alter publication supabase_realtime add table public.schedule_slots;
 end if;
end$$;
