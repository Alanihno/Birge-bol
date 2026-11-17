import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { metric } from '../_shared/ai-gateway.ts';

const allowed=new Set(['https://birge-bol.vercel.app','https://birge-bol-alans-projects-f2e926b6.vercel.app',...(Deno.env.get('ALLOWED_ORIGINS')||'').split(',').map(s=>s.trim()).filter(Boolean)]);
function reply(req:Request,data:unknown,status=200){const origin=req.headers.get('Origin')||'';return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS',...(allowed.has(origin)?{'Access-Control-Allow-Origin':origin}:{})}});}
Deno.serve(async req=>{
 const origin=req.headers.get('Origin');if(origin&&!allowed.has(origin))return reply(req,{error:'origin'},403);
 if(req.method==='OPTIONS')return reply(req,{ok:true});if(req.method!=='POST')return reply(req,{error:'method'},405);
 try{
  const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')||''}},auth:{persistSession:false}});
  const auth=await client.auth.getUser();if(auth.error||!auth.data.user||!auth.data.user.email_confirmed_at)return reply(req,{error:'auth'},401);
  const raw=await req.text();if(new TextEncoder().encode(raw).length>1024)return reply(req,{error:'size'},413);
  const input=JSON.parse(raw);if(!input||Object.keys(input).some(k=>!['message_id','target','kind'].includes(k))||!['ru','kk'].includes(input.target)||typeof input.message_id!=='string'||!/^[a-f0-9-]{36}$/i.test(input.message_id))return reply(req,{error:'body'},400);
  // The source comes from a row authorized by the caller's JWT, never from client-supplied text.
  const tables:Record<string,string>={message:'care_messages',reply:'community_replies',team:'team_recommendations',question:'questions',answer:'answers',review:'reviews'};
  const kind=typeof input.kind==='string'?input.kind:'message';if(!tables[kind])return reply(req,{error:'body'},400);
  const message=await client.from(tables[kind]).select('id,body').eq('id',input.message_id).maybeSingle();if(message.error||!message.data)return reply(req,{error:'not_found'},404);
  const source=message.data.body;
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source)))).map(n=>n.toString(16).padStart(2,'0')).join('');
  const cacheTable=kind==='message'?'message_translations':'content_translations';
  let cacheQuery=client.from(cacheTable).select('translated_text,source_hash').eq('target_language',input.target);
  cacheQuery=kind==='message'?cacheQuery.eq('message_id',message.data.id):cacheQuery.eq('source_id',message.data.id).eq('source_kind',kind);
  const cached=await cacheQuery.maybeSingle();
  if(cached.data?.source_hash===hash){await metric('translation','cache');return reply(req,{text:cached.data.translated_text,target:input.target,cached:true});}
  await metric('translation','blocked');
  return reply(req,{error:'unavailable',reason:'privacy_policy',message:'Готового перевода нет. Внешний перевод личных сообщений отключён.'},503);
 }catch{return reply(req,{error:'unavailable'},503);}
});
