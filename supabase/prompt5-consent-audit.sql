create function private.audit_appointment_consent() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='INSERT' then
  if not coalesce(new.share_diary,false) and new.diagnosis is null then return new;end if;
 elsif new.share_diary is not distinct from old.share_diary and (new.diagnosis is null) is not distinct from (old.diagnosis is null) then return new;
 end if;
 insert into public.consent_events(user_id,kind,document_version,granted,recipient_id)
 values(new.parent_id,'data_share','2026-11-17.draft.1',coalesce(new.share_diary,false) or new.diagnosis is not null,new.specialist_id);
 return new;
end $$;
revoke all on function private.audit_appointment_consent() from public,anon,authenticated;
create trigger appointment_consent_audit after insert or update of share_diary,diagnosis on public.appointments for each row execute function private.audit_appointment_consent();
do $$declare definition text;begin
 select pg_get_functiondef('private.rating_values(numeric,text,text)'::regprocedure) into definition;
 if position('left join approved a on a.specialist_id=s.id left join' in definition)=0 then raise exception 'Unexpected rating join';end if;
 execute replace(definition,'left join approved a on a.specialist_id=s.id left join','left join approved a on a.specialist_id=s.id and a.is_demo=s.is_demo left join');
end $$;
