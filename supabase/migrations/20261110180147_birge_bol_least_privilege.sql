-- Supabase's default public-schema grants vary. Reset table privileges explicitly, then grant only required operations.
revoke all on all tables in schema public from anon,authenticated;
grant select on public.user_roles to authenticated;
grant select,insert,delete on public.profiles to authenticated;
grant update(language) on public.profiles to authenticated;
do $$ declare tbl text;begin foreach tbl in array array['children','consent_records','favorites','appointments','waitlist','session_feedback','review_reports','child_goals','progress_entries'] loop execute format('grant select,insert,delete on public.%I to authenticated',tbl);end loop;end $$;
grant update(id,parent_id,label,age,city,district,concerns,experience,budget,format) on public.children to authenticated;
grant update(id,parent_id,child_id,title,metric,target,due_at,status) on public.child_goals to authenticated;
grant update on public.favorites to authenticated;
grant select on public.notifications to authenticated;
grant update(read) on public.notifications to authenticated;
grant select on public.cities,public.districts,public.specializations,public.specialists,public.specialist_services,public.medical_terms,public.recommendation_rules,public.questions,public.answers to anon,authenticated;
grant insert,update,delete on public.specialists,public.medical_terms,public.recommendation_rules,public.questions,public.answers,public.reviews to authenticated;
grant select on public.reviews to authenticated;
grant select(id,specialist_id,body,contact,status,is_demo,created_at) on public.reviews to anon;
grant select,insert,update,delete on public.mentors to authenticated;
grant select on public.audit_logs to authenticated;
-- Public functions default to PUBLIC execution. Only explicitly authorized functions are callable.
revoke all on function public.submit_feedback(uuid,uuid,jsonb,text) from public,anon;
grant execute on function public.submit_feedback(uuid,uuid,jsonb,text) to authenticated;
