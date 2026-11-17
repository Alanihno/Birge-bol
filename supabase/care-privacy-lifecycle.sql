alter table public.task_assignments drop constraint task_assignments_parent_id_fkey;
alter table public.task_assignments add constraint task_assignments_parent_id_fkey foreign key(parent_id) references auth.users(id) on delete cascade;
alter table public.task_completions drop constraint task_completions_parent_id_fkey;
alter table public.task_completions add constraint task_completions_parent_id_fkey foreign key(parent_id) references auth.users(id) on delete cascade;
alter table public.family_task_links drop constraint family_task_links_parent_id_fkey;
alter table public.family_task_links add constraint family_task_links_parent_id_fkey foreign key(parent_id) references auth.users(id) on delete cascade;
alter table public.task_assignments drop constraint task_assignments_goal_id_fkey;
alter table public.task_assignments add constraint task_assignments_goal_id_fkey foreign key(goal_id) references public.child_goals(id) on delete set null;
-- Cancelling a future visit does not cancel an ongoing assignment or the parent's consent.
create or replace function private.has_patient(cid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.appointments a join public.specialists s on s.id=a.specialist_id where a.child_id=cid and s.owner_id=auth.uid() and a.share_diary and (a.status in ('confirmed','attended','completed') or (a.status='cancelled' and exists(select 1 from public.task_assignments t where t.child_id=cid and t.specialist_id=s.id and t.status<>'cancelled'))))
$$;
