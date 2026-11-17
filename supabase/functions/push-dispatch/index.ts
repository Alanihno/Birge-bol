import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import webpush from 'npm:web-push@3.6.7';
const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
async function equal(a:string,b:string){const enc=new TextEncoder();const [x,y]=await Promise.all([crypto.subtle.digest('SHA-256',enc.encode(a)),crypto.subtle.digest('SHA-256',enc.encode(b))]);const left=new Uint8Array(x),right=new Uint8Array(y);return left.reduce((n,v,i)=>n|(v^right[i]),0)===0;}
Deno.serve(async req=>{
 if(req.method!=='POST')return new Response('{}',{status:405,headers});
 const token=Deno.env.get('PUSH_CRON_SECRET');if(!token||!await equal(req.headers.get('Authorization')||'','Bearer '+token))return new Response('{}',{status:401,headers});
 const publicKey=Deno.env.get('VAPID_PUBLIC_KEY'),privateKey=Deno.env.get('VAPID_PRIVATE_KEY'),subject=Deno.env.get('VAPID_SUBJECT');
 if(!publicKey||!privateKey||!subject)return new Response(JSON.stringify({error:'not_configured'}),{status:503,headers});
 try{
 webpush.setVapidDetails(subject,publicKey,privateKey);
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 const reminders=await admin.rpc('schedule_notification_reminders');if(reminders.error)throw Error('reminders');
 const batch=await admin.rpc('claim_push_batch');if(batch.error)throw Error('queue');let sent=0,failed=0;
 for(const item of batch.data){let code=500;try{
   // Never forward notification.title: it could contain personal or medical information.
   const endpoint=new URL(item.endpoint);if(endpoint.protocol!=='https:'||!['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(endpoint.hostname)&&!endpoint.hostname.endsWith('.notify.windows.com')){code=410;}else{await webpush.sendNotification({endpoint:item.endpoint,keys:item.keys},JSON.stringify({title:'Birge Bol',body:'В Birge Bol есть новое уведомление',url:'/notifications',tag:'birge-'+item.notification_id}),{TTL:3600,timeout:8000});code=201;sent++;}
 }catch(error){code=typeof error==='object'&&error!==null&&'statusCode'in error?Number(error.statusCode):500;failed++;}
 const result=await admin.rpc('finish_push_delivery',{p_notification:item.notification_id,p_subscription:item.subscription_id,p_code:code});if(result.error)throw Error('delivery');
 }
 return new Response(JSON.stringify({sent,failed}),{headers});
 }catch{return new Response(JSON.stringify({error:'temporarily_unavailable'}),{status:503,headers});}
});
