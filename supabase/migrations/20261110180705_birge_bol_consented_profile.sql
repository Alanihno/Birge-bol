create function public.save_synthetic_child(p_child jsonb) returns uuid language plpgsql security invoker set search_path='' as $$ declare cid uuid;begin
 if auth.uid() is null then raise exception 'authentication required';end if;
 if length(p_child::text)>2048 or position('демо' in lower(p_child->>'label'))=0 then raise exception 'synthetic profiles only';end if;
 cid=(p_child->>'id')::uuid;
 insert into public.children(id,parent_id,label,age,city,district,concerns,experience,budget,format) values(cid,auth.uid(),p_child->>'label',p_child->>'age',p_child->>'city',p_child->>'district',array(select jsonb_array_elements_text(p_child->'concerns')),p_child->>'experience',(p_child->>'budget')::integer,p_child->>'format')
 on conflict(id) do update set label=excluded.label,age=excluded.age,city=excluded.city,district=excluded.district,concerns=excluded.concerns,experience=excluded.experience,budget=excluded.budget,format=excluded.format;
 insert into public.consent_records(parent_id,purpose,version) values(auth.uid(),'synthetic_profile','mvp-1');return cid;end $$;
revoke all on function public.save_synthetic_child(jsonb) from public,anon;
grant execute on function public.save_synthetic_child(jsonb) to authenticated;
