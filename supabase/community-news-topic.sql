alter table public.questions drop constraint questions_topic_check;
alter table public.questions add constraint questions_topic_check check(topic in ('Новости','Речь','Занятия','ПМПК','Поддержка'));
