-- Signed-in providers and families use private Storage objects; demo assets stay public and synthetic.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('care-materials','care-materials',false,52428800,array['video/webm','video/mp4','application/pdf','image/png','image/jpeg','text/vtt']) on conflict(id) do nothing;
create policy care_material_upload on storage.objects for insert to authenticated with check(bucket_id='care-materials' and (storage.foldername(name))[1]=(select auth.uid())::text and (select private.care_role())='specialist');
create policy care_material_read on storage.objects for select to authenticated using(bucket_id='care-materials' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select private.is_staff()) or exists(select 1 from public.task_materials m join public.task_assignments a on a.material_id=m.id where m.status='approved' and a.parent_id=(select auth.uid()) and ('storage:'||storage.objects.name) in (m.video_url,m.memo_url,m.captions_ru,m.captions_kk))));
alter table public.task_materials add constraint safe_material_urls check(
 (video_url is null or video_url ~ '^(storage:[0-9a-f-]+/[^[:space:]]+|/video/[^[:space:]]+)$') and
 (memo_url is null or memo_url ~ '^(storage:[0-9a-f-]+/[^[:space:]]+|/materials/[^[:space:]]+)$') and
 (captions_ru is null or captions_ru ~ '^(storage:[0-9a-f-]+/[^[:space:]]+|/video/[^[:space:]]+)$') and
 (captions_kk is null or captions_kk ~ '^(storage:[0-9a-f-]+/[^[:space:]]+|/video/[^[:space:]]+)$'));
create policy deny_direct_attendance_tokens on private.attendance_tokens for all to authenticated using(false) with check(false);
-- Stage and goal edits remain auditable, with a concrete link from every assignment to the diary.
do $$declare definition text;begin
 select pg_get_functiondef('private.care_command(text,jsonb)'::regprocedure) into definition;
 definition=replace(definition,
 '   insert into public.task_assignments(parent_id,child_id,specialist_id,material_id,goal_id,goal_title,duration,frequency,due_at,comment)',
 '   if aid is null then
     select id into aid from public.child_goals where child_id=oid and specialist_id=sid and title=coalesce(p->>''goal_title'',''Обсудить на приёме'') order by created_at desc limit 1;
     if aid is null then insert into public.child_goals(parent_id,child_id,specialist_id,title,metric,target,due_at) values(target,oid,sid,coalesce(p->>''goal_title'',''Обсудить на приёме''),''Согласованные этапы'',4,(p->>''due_at'')::date) returning id into aid;end if;
   end if;
   insert into public.task_assignments(parent_id,child_id,specialist_id,material_id,goal_id,goal_title,duration,frequency,due_at,comment)');
 execute definition;
end$$;
-- Never expose private child diagnoses with a generic SELECT, including to consented providers.
-- Providers obtain only the explicit, consent-filtered projection in care_snapshot.
revoke execute on function public.submit_feedback(uuid,uuid,jsonb,text) from authenticated;
grant execute on function private.family_task(text),public.family_task(text) to service_role;
