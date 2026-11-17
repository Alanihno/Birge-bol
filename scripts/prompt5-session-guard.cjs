const fs=require('node:fs');const p='src/lib/app-context.tsx';let s=fs.readFileSync(p,'utf8');s=s.replace("import {setDraftScope} from './update-safety';","import {setDraftScope,clearPrivateDrafts} from './update-safety';");const start=s.indexOf(" useEffect(()=>{if(mode==='demo')return;if(!supabase)");const end=s.indexOf('\n useEffect',start+1);if(start<0||end<0)throw Error('Auth effect not found');
s=s.slice(0,start)+` useEffect(()=>{
  if(mode==='demo')return;if(!supabase){setAuthReady(true);return;}let alive=true,previous=sessionStorage.getItem('bb-user-scope');
  const accept=(session:{user:{id:string;email_confirmed_at?:string|null}}|null,event:string)=>{
   if(!alive)return;const next=session?.user.email_confirmed_at?session.user.id:null;
   if(event==='PASSWORD_RECOVERY')sessionStorage.setItem('bb-recovery-active','1');
   if(next!==previous){if(localStorage.getItem('bb-push-user')&&localStorage.getItem('bb-push-user')!==next)void detachPush().catch(()=>{/* Subscription is revoked in the browser before server cleanup. */});qc.clear();clearPrivateDrafts();setVisitCode(null);setDraftState(demoChild);setActiveId('');sessionStorage.removeItem('bb-onboarding');sessionStorage.removeItem('bb-active-child');}
   if(next)sessionStorage.setItem('bb-user-scope',next);else sessionStorage.removeItem('bb-user-scope');previous=next;setUserId(next);setAuthReady(true);
  };
  void supabase.auth.getSession().then(({data})=>accept(data.session,'INITIAL_SESSION')).catch(()=>accept(null,'INITIAL_SESSION'));
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>accept(session,event));return()=>{alive=false;subscription.unsubscribe();};
 },[qc]);`+s.slice(end);
s=s.replace("setDraftState(demoChild);qc.clear();return true;","setDraftState(demoChild);sessionStorage.removeItem('bb-user-scope');clearPrivateDrafts();qc.clear();return true;");fs.writeFileSync(p,s);
