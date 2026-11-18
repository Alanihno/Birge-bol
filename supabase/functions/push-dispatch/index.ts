import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import webpush from 'npm:web-push@3.6.7';
const allowed=(Deno.env.get('ALLOWED_ORIGINS')||'https://birge-bol.vercel.app,https://birge-bol-alans-projects-f2e926b6.vercel.app,http://127.0.0.1:4174,http://127.0.0.1:4180,http://localhost:5173,http://127.0.0.1:5173').split(',');
function response(req:Request,body:unknown,status=200){const origin=req.headers.get('Origin')||'';return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(allowed.includes(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'}});}
async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
async function equal(a:string,b:string){const x=await digest(a),y=await digest(b);let difference=0;for(let i=0;i<x.length;i++)difference|=x.charCodeAt(i)^y.charCodeAt(i);return difference===0;}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return response(req,{});
 if(req.method!=='POST')return response(req,{},405);
 if(req.headers.get('Origin')&&!allowed.includes(req.headers.get('Origin')!))return response(req,{},403);
 const authorization=req.headers.get('Authorization')||'';if(!authorization.startsWith('Bearer '))return response(req,{},401);
 try{
 const url=Deno.env.get('SUPABASE_URL')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const runtime=await admin.rpc('push_server_config');if(runtime.error)throw Error('config');
 const config=runtime.data||{},token=Deno.env.get('PUSH_CRON_SECRET')||config.birge_push_cron;
 const publicKey=Deno.env.get('VAPID_PUBLIC_KEY')||config.birge_push_vapid_public,privateKey=Deno.env.get('VAPID_PRIVATE_KEY')||config.birge_push_vapid_private,subject=Deno.env.get('VAPID_SUBJECT')||config.birge_push_subject;
 const cron=!!token&&await equal(authorization,'Bearer '+token);
 let batch;
 if(cron){const reminders=await admin.rpc('schedule_notification_reminders');if(reminders.error)throw Error('reminders');batch=await admin.rpc('claim_push_batch');}
 else{
  const client=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
  const {data,error}=await client.auth.getUser();if(error||!data.user?.email_confirmed_at)return response(req,{},401);
  const text=await req.text();if(text.length>1024)return response(req,{},413);const body=JSON.parse(text||'{}');if(body.test!==true)return response(req,{},403);
  const quota=await admin.rpc('identity_attempt',{p_login:await digest(data.user.id),p_network:await digest(service+'|'+(req.headers.get('x-forwarded-for')||'unknown')),p_bucket:'push-test'});if(quota.error)throw Error('quota');if(!quota.data)return response(req,{error:'Слишком много проверок. Повторите позже.'},429);
  const notice=await admin.from('notifications').insert({parent_id:data.user.id,title:'Проверка уведомлений Birge Bol',to:'/notifications',source_key:'test:'+crypto.randomUUID()}).select('id').single();if(notice.error)throw Error('notice');
  batch=await admin.rpc('claim_test_push',{p_user:data.user.id,p_notice:notice.data.id});
 }
 if(!publicKey||!privateKey||!subject)return response(req,{error:'Сервер уведомлений временно недоступен'},503);
 if(batch.error)throw Error('queue');const items=batch.data||[];
 if(!cron&&!items.length)return response(req,{error:'Сначала включите уведомления на устройстве.'},409);
 webpush.setVapidDetails(subject,publicKey,privateKey);
 let sent=0,failed=0;
 for(let offset=0;offset<items.length;offset+=5){
  const results=await Promise.allSettled(items.slice(offset,offset+5).map(async(item:{endpoint:string;keys:{p256dh:string;auth:string};notification_id:string;subscription_id:string})=>{
   let code=500;try{const endpoint=new URL(item.endpoint);if(endpoint.protocol!=='https:'||!['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(endpoint.hostname)&&!endpoint.hostname.endsWith('.notify.windows.com'))code=410;else{await webpush.sendNotification({endpoint:item.endpoint,keys:item.keys},JSON.stringify({title:'Birge Bol',body:'В Birge Bol есть новое уведомление',url:'/notifications',tag:'birge-'+item.notification_id}),{TTL:3600,timeout:8000});code=201;sent++;}}catch(error){code=typeof error==='object'&&error!==null&&'statusCode'in error?Number(error.statusCode):500;failed++;}
   const result=await admin.rpc('finish_push_delivery',{p_notification:item.notification_id,p_subscription:item.subscription_id,p_code:code});if(result.error)throw Error('delivery');
  }));if(results.some(r=>r.status==='rejected'))throw Error('delivery');
 }
 return response(req,{sent,failed,acceptedByPushService:sent>0});
 }catch{return response(req,{error:'Отправка временно недоступна. Повторите позже.'},503);}
});
