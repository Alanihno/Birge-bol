const fs=require('fs'),ts=require('typescript'),vm=require('vm');
const source=fs.readFileSync('src/domain/navigation-graph.ts','utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const context={exports:{}};vm.runInNewContext(code,context);const {navigationNodes:nodes,navigationEdges:edges}=context.exports;
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
let sql=`create table public.app_graph_nodes(id text primary key,label text not null,kind text not null,routes jsonb not null,roles text[] not null,tables text[] not null,description text not null,x numeric not null,y numeric not null);
create table public.app_graph_edges(source text references public.app_graph_nodes(id) on delete cascade,target text references public.app_graph_nodes(id) on delete cascade,relation text not null,key text,primary key(source,target,relation));
create table public.app_graph_keywords(node_id text references public.app_graph_nodes(id) on delete cascade,keyword text not null,primary key(node_id,keyword));
create index app_graph_keyword_search on public.app_graph_keywords(keyword);
alter table public.app_graph_nodes enable row level security;
alter table public.app_graph_edges enable row level security;
alter table public.app_graph_keywords enable row level security;
revoke all on public.app_graph_nodes,public.app_graph_edges,public.app_graph_keywords from public,anon,authenticated;
grant select on public.app_graph_nodes,public.app_graph_edges,public.app_graph_keywords to authenticated;
create policy role_nodes on public.app_graph_nodes for select to authenticated using(private.care_role()=any(roles) or private.is_staff());
create policy role_edges on public.app_graph_edges for select to authenticated using(exists(select 1 from public.app_graph_nodes n where n.id=source) and exists(select 1 from public.app_graph_nodes n where n.id=target));
create policy role_keywords on public.app_graph_keywords for select to authenticated using(exists(select 1 from public.app_graph_nodes n where n.id=node_id));
`;
for(const n of nodes){sql+=`insert into public.app_graph_nodes values(${[n.id,n.label,n.kind].map(quote).join(',')},${quote(JSON.stringify(n.routes||{}))}::jsonb,${quote('{'+n.roles.join(',')+'}')}::text[],${quote('{'+n.tables.join(',')+'}')}::text[],${quote(n.description)},${n.x},${n.y});\n`;for(const k of n.keywords)sql+=`insert into public.app_graph_keywords values(${quote(n.id)},${quote(k)});\n`;}
for(const e of edges)sql+=`insert into public.app_graph_edges values(${quote(e.source)},${quote(e.target)},${quote(e.relation)},${e.key?quote(e.key):'null'});\n`;
sql+=`create function public.app_navigation_graph() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('nodes',(select coalesce(jsonb_agg(to_jsonb(n)||jsonb_build_object('route',n.routes->>private.care_role(),'keywords',(select coalesce(jsonb_agg(k.keyword),'[]') from public.app_graph_keywords k where k.node_id=n.id))),'[]') from public.app_graph_nodes n),'edges',(select coalesce(jsonb_agg(to_jsonb(e)),'[]') from public.app_graph_edges e)) where auth.uid() is not null
$$;
revoke all on function public.app_navigation_graph() from public,anon;
grant execute on function public.app_navigation_graph() to authenticated;
`;
fs.writeFileSync('supabase/navigation-graph.sql',sql);console.log(JSON.stringify({nodes:nodes.length,edges:edges.length,keywords:nodes.reduce((n,x)=>n+x.keywords.length,0)}));
// Finish the payment panel insertion without changing the existing action layout.
const ui='src/components/care-ui.tsx';let text=fs.readFileSync(ui,'utf8');if(!text.includes('<PaymentActions appointment=')){text=text.replace('<div className="row">','<PaymentActions appointment={a} provider={provider} clinic={clinic}/><div className="row">');fs.writeFileSync(ui,text);}
