import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.119.0';
const allowed=(Deno.env.get('ALLOWED_ORIGINS')||'https://birge-bol.vercel.app,https://birge-bol-alans-projects-f2e926b6.vercel.app,http://127.0.0.1:4174,http://127.0.0.1:4180,http://localhost:5173').split(',').map(x=>x.trim()).filter(Boolean);
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Access-Control-Allow-Origin':allowed.includes(origin)?origin:'null','Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Content-Type':'application/json','Cache-Control':'no-store'};
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method!=='POST'||!allowed.includes(origin))return response({error:'forbidden'},403);
 try{
  const {token,path}=await req.json();
  if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)||typeof path!=='string'||!path.startsWith('storage:'))return response({error:'invalid'},400);
  const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  // The link lookup exposes one task only and checks expiry/revocation on every request.
  const {data:task,error}=await client.rpc('family_task',{p_token:token});
  if(error||!task||![task.video_url,task.memo_url,task.captions_ru,task.captions_kk].includes(path))return response({error:'unavailable'},404);
  const signed=await client.storage.from('care-materials').createSignedUrl(path.slice(8),60);
  if(signed.error)return response({error:'unavailable'},404);
  return response({url:signed.data.signedUrl});
 }catch{return response({error:'unavailable'},400);}
});
