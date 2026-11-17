begin;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
update community_preferences set topics=array['Поведение'],notify_new=true where user_id=auth.uid();
select care_set_team_access('10000000-0000-4000-8000-000000000001',md5('bb-contest-provider-resource-1')::uuid,true);
select set_config('request.jwt.claims',jsonb_build_object('sub',md5('bb-contest-professional-resource-1')::uuid,'role','authenticated')::text,true);
do $$begin
 if not private.has_patient('10000000-0000-4000-8000-000000000001') then raise exception 'Team grant missing';end if;
 if (select count(*) from team_recommendations where child_id='10000000-0000-4000-8000-000000000001')<3 then raise exception 'Shared recommendations missing';end if;
 insert into team_recommendations(child_id,specialist_id,body) values('10000000-0000-4000-8000-000000000001',md5('bb-contest-provider-resource-1')::uuid,'Проверка: рекомендация видна общей команде.');
end$$;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select care_set_team_access('10000000-0000-4000-8000-000000000001',md5('bb-contest-provider-resource-1')::uuid,false);
select set_config('request.jwt.claims',jsonb_build_object('sub',md5('bb-contest-professional-resource-1')::uuid,'role','authenticated')::text,true);
do $$begin
 if private.has_patient('10000000-0000-4000-8000-000000000001') then raise exception 'Revoke failed';end if;
 if exists(select 1 from team_recommendations where child_id='10000000-0000-4000-8000-000000000001') then raise exception 'Revoked recommendations leaked';end if;
end$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',md5('bb-prepared-family-38')::uuid,'role','authenticated')::text,true);
insert into questions(id,parent_id,title,body,topic,status,is_demo) values(md5('bb-test-new-thread')::uuid,auth.uid(),'Как обсуждать трудные ситуации?','Поделитесь, какие вопросы вы заранее записываете для обсуждения со специалистом.','Поведение','pending_moderation',false);
insert into community_replies(question_id,parent_id,body) values(md5('bb-test-new-thread')::uuid,auth.uid(),'Мне помогает короткий список вопросов к встрече.');
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$begin
 if not exists(select 1 from questions where id=md5('bb-test-new-thread')::uuid and status='open') then raise exception 'Immediate thread publication failed';end if;
 if not exists(select 1 from notifications where parent_id=auth.uid() and "to"='/moms/questions/'||md5('bb-test-new-thread')::uuid) then raise exception 'New-thread notification missing';end if;
 if not exists(select 1 from community_replies where question_id=md5('bb-test-new-thread')::uuid and status='approved') then raise exception 'Reply synchronization failed';end if;
end$$;
select 'team grants, shared notes, revocation, new-thread notifications and synchronized replies verified' as verification;
rollback;
