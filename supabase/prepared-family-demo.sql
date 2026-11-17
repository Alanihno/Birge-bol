-- Additive setup for the existing synthetic shared accounts. Never overwrite a family record.
insert into public.children(id,parent_id,label,age,city,district,concerns,experience,budget,format)
values
('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','Амина · демо','4–5','Алматы','Бостандыкский',array['communication'],'first',20000,'any'),
('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','Данияр · демо','6–8','Алматы','Бостандыкский',array['learning'],'visited',20000,'any')
on conflict(id) do nothing;
insert into public.clinic_branches(id,clinic_id,name,district,address)
values ('31000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Основной филиал · демо','Бостандыкский','Алматы · учебный адрес')
on conflict(id) do nothing;
