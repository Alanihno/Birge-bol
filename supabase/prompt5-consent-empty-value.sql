alter table public.consent_events alter column created_at set default clock_timestamp();
create or replace function private.audit_appointment_consent() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='INSERT' then
  if not coalesce(new.share_diary,false) and nullif(btrim(new.diagnosis),'') is null then return new;end if;
 elsif new.share_diary is not distinct from old.share_diary and (nullif(btrim(new.diagnosis),'') is null) is not distinct from (nullif(btrim(old.diagnosis),'') is null) then return new;
 end if;
 insert into public.consent_events(user_id,kind,document_version,granted,recipient_id)
 values(new.parent_id,'data_share','2026-11-17.draft.1',coalesce(new.share_diary,false) or nullif(btrim(new.diagnosis),'') is not null,new.specialist_id);
 return new;
end $$;
