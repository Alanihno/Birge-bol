import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import {normalizeLogin,loginEmail,sha256,normalizedRecovery} from '../../../shared/account-identity.ts';
const url=Deno.env.get('SUPABASE_URL')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!;
const allowed=(Deno.env.get('ALLOWED_ORIGINS')||'https://birge-bol.vercel.app,https://birge-bol-alans-projects-f2e926b6.vercel.app,http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:4173,http://127.0.0.1:4174,http://127.0.0.1:4180').split(',');
const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
function reply(req:Request,body:unknown,status=200){const origin=req.headers.get('Origin')||'';return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(allowed.includes(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'}});}
function code(){return 'BB-'+Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('').toUpperCase().match(/.{8}/g)!.join('-');}
async function passwordCheck(password:string){
 if(password.length<12||password.length>128||/^(.)\1+$/.test(password)||/^(?:password|qwerty|123456|пароль)/i.test(password))throw Error('Выберите уникальный пароль от 12 до 128 символов.');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1',new TextEncoder().encode(password))),b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
 const response=await fetch('https://api.pwnedpasswords.com/range/'+hash.slice(0,5),{headers:{'Add-Padding':'true'},signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('Проверка пароля временно недоступна. Повторите позже.');
 const text=await response.text();if(text.length>300000||!text.trim()||!text.trim().split(/\r?\n/).every(line=>/^[A-F0-9]{35}:\d+$/.test(line)))throw Error('Проверка пароля временно недоступна. Повторите позже.');
 if(text.split(/\r?\n/).some(line=>line.startsWith(hash.slice(5)+':')&&Number(line.split(':')[1])>0))throw Error('Этот пароль встречается в известных утечках. Выберите другой, уникальный пароль.');
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return reply(req,{});
 if(req.method!=='POST')return reply(req,{error:'Метод не поддерживается'},405);
 if(req.headers.get('Origin')&&!allowed.includes(req.headers.get('Origin')!))return reply(req,{error:'Запрос отклонён'},403);
 try{
  const raw=await req.text();if(raw.length>4096)return reply(req,{error:'Слишком большой запрос'},413);const body=JSON.parse(raw);
  if(body.action==='capabilities'){const response=await fetch(url+'/auth/v1/settings',{headers:{apikey:anon}});const config=await response.json();return reply(req,{username:true,emailConfirmation:!config.mailer_autoconfirm,providers:Object.entries(config.external||{}).filter(([,enabled])=>enabled===true).map(([name])=>name),resendKeyConfigured:!!Deno.env.get('RESEND_API_KEY')});}
  if(!['register','recover','rotate'].includes(body.action))return reply(req,{error:'Запрос отклонён'},400);
  const login=normalizeLogin(String(body.login||'')),loginHash=await sha256(login),password=String(body.password||'');
  const network=await sha256(service+'|'+(req.headers.get('x-forwarded-for')?.split(',')[0]||'unknown'));
  const attempt=await admin.rpc('identity_attempt',{p_login:loginHash,p_network:network,p_bucket:body.action==='register'?'register':'recover'});if(attempt.error)throw Error('Сервис регистрации временно недоступен');if(!attempt.data)return reply(req,{error:'Слишком много попыток. Повторите через час.'},429);
  if(body.action!=='rotate')await passwordCheck(password);const replacement=code(),replacementHash=await sha256(normalizedRecovery(replacement));
  if(body.action==='rotate'){
   const temporary=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});const session=await temporary.auth.signInWithPassword({email:await loginEmail(login),password});
   if(session.error||!session.data.session||session.data.user.app_metadata.credential_method!=='username')return reply(req,{error:'Проверьте логин и текущий пароль'},400);
   const rotated=await admin.rpc('rotate_identity_recovery',{p_user:session.data.user.id,p_hash:replacementHash});await admin.auth.admin.signOut(session.data.session.access_token,'local');
   if(rotated.error)throw Error('Не удалось обновить резервный код. Повторите позже.');return reply(req,{recovery_code:replacement});
  }
  if(body.action==='register'){
   if(body.consent!==true)return reply(req,{error:'Подтвердите условия'},400);
   const created=await admin.auth.admin.createUser({email:await loginEmail(login),password,email_confirm:true,user_metadata:{display_login:login},app_metadata:{credential_method:'username'}});
   if(created.error||!created.data.user)return reply(req,{error:'Этот логин недоступен. Выберите другой или войдите.'},409);
   const saved=await admin.rpc('set_identity_recovery',{p_user:created.data.user.id,p_login:loginHash,p_hash:replacementHash});
   const consent=saved.error?null:await admin.from('consent_events').insert({user_id:created.data.user.id,kind:'platform',document_version:'2026-11-17.draft.1',granted:true});
   if(saved.error||consent?.error){await admin.auth.admin.deleteUser(created.data.user.id);throw Error('Не удалось завершить регистрацию. Повторите позже.');}
   return reply(req,{created:true,recovery_code:replacement},201);
  }
  const recovery=normalizedRecovery(String(body.recovery_code||''));if(!/^BB[A-F0-9]{64}$/.test(recovery))return reply(req,{error:'Проверьте логин и резервный код'},400);
  const claim=await admin.rpc('claim_identity_recovery',{p_login:loginHash,p_hash:await sha256(recovery)});if(claim.error||!claim.data)return reply(req,{error:'Проверьте логин и резервный код'},400);
  const {user_id,lease}=claim.data;
  try{
   const changed=await admin.auth.admin.updateUserById(user_id,{password});if(changed.error)throw Error('Не удалось изменить пароль');
   const temporary=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});const session=await temporary.auth.signInWithPassword({email:await loginEmail(login),password});
   if(session.error||!session.data.session)throw Error('Не удалось завершить восстановление');
   const revoked=await admin.auth.admin.signOut(session.data.session.access_token,'global');if(revoked.error)throw Error('Не удалось завершить прежние сеансы');
   const finished=await admin.rpc('finish_identity_recovery',{p_user:user_id,p_lease:lease,p_hash:replacementHash});if(finished.error)throw Error('Не удалось обновить резервный код');
   return reply(req,{changed:true,recovery_code:replacement});
  }catch(error){await admin.rpc('finish_identity_recovery',{p_user:user_id,p_lease:lease,p_hash:null});throw error;}
 }catch(error){const message=error instanceof Error?error.message:'';const safe=/^(Логин:|Выберите уникальный пароль|Этот пароль|Проверка пароля|Сервис регистрации|Не удалось)/.test(message)?message:'Сервис временно недоступен. Повторите позже.';return reply(req,{error:safe},400);}
});
