-- Keep account removal functional after adding provider/clinic references.
alter table public.specialists drop constraint specialists_owner_id_fkey;
alter table public.specialists add constraint specialists_owner_id_fkey foreign key(owner_id) references auth.users(id) on delete set null;
alter table public.clinics alter column owner_id drop not null;
alter table public.clinics drop constraint clinics_owner_id_fkey;
alter table public.clinics add constraint clinics_owner_id_fkey foreign key(owner_id) references auth.users(id) on delete set null;
alter table public.task_materials alter column author_id drop not null;
alter table public.task_materials drop constraint task_materials_author_id_fkey;
alter table public.task_materials add constraint task_materials_author_id_fkey foreign key(author_id) references auth.users(id) on delete set null;
alter table public.care_messages drop constraint care_messages_sender_id_fkey;
alter table public.care_messages add constraint care_messages_sender_id_fkey foreign key(sender_id) references auth.users(id) on delete cascade;
alter table public.care_reminders drop constraint care_reminders_user_id_fkey;
alter table public.care_reminders add constraint care_reminders_user_id_fkey foreign key(user_id) references auth.users(id) on delete cascade;
alter table public.qualification_documents drop constraint qualification_documents_owner_id_fkey;
alter table public.qualification_documents add constraint qualification_documents_owner_id_fkey foreign key(owner_id) references auth.users(id) on delete cascade;
create function private.offboard_provider() returns trigger language plpgsql security definer set search_path='' as $$begin
 update public.specialists set published=false,verification_status='pending' where owner_id=old.id;
 update public.clinics set status='pending' where owner_id=old.id;
 insert into public.notifications(parent_id,title,"to") select a.parent_id,'Специалист прекратил работу в платформе. Уточните дальнейший план.','/diary' from public.appointments a join public.specialists s on s.id=a.specialist_id where s.owner_id=old.id and a.status in ('pending','confirmed','rescheduled');
 update public.schedule_slots sl set available=false where exists(select 1 from public.specialists s where s.id=sl.specialist_id and s.owner_id=old.id);
 return old;end$$;
revoke all on function private.offboard_provider() from public,anon,authenticated;
create trigger offboard_provider before delete on auth.users for each row execute function private.offboard_provider();
create or replace function private.care_notice(uid uuid,title text,path text) returns void language sql set search_path='' as $$insert into public.notifications(parent_id,title,"to") select uid,title,path where uid is not null$$;
-- A synthetic address lets the shared demo profile be edited without an unrelated required-field error.
update public.specialists set address='Алматы, учебный адрес 1' where id='00000000-0000-4000-8000-000000000001' and is_demo;
