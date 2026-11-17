-- Keep the existing versioned Bayesian calculation, but never display the platform prior
-- as if it were a provider's own rating when they have zero verified reviews.
do $$declare definition text;begin
 select pg_get_functiondef('private.rating_values(numeric,text,text)'::regprocedure) into definition;
 if position('case when c is null then null else' in definition)=0 then raise exception 'Unexpected rating function definition';end if;
 definition=replace(definition,'case when c is null then null else','case when c is null or v=0 then null else');
 execute definition;
end $$;
insert into public.app_graph_nodes(id,label,kind,routes,roles,tables,description,x,y)
values('payments-cart','Оплата — корзина','screen','{"parent":"/payments"}',array['parent'],array['appointments','private.booking_payments'],'Записи к оплате, чеки и история. Каждая услуга оплачивается отдельно.',310,650)
on conflict(id) do nothing;
update public.app_graph_nodes set routes=jsonb_set(routes,'{parent}','"/payments"') where id='payments';
insert into public.app_graph_edges(source,target,relation) values('birge','payments-cart','раздел') on conflict do nothing;
