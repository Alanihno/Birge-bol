import { createClient } from '@supabase/supabase-js';
if(new URLSearchParams(location.search).get('mode')==='demo')sessionStorage.setItem('bb-mode-v2','demo');
const storedMode=sessionStorage.getItem('bb-mode-v2');
export const demoOnly=import.meta.env.VITE_DEMO_ONLY==='true';
export const mode=demoOnly?'demo':storedMode==='demo'||storedMode==='supabase'?storedMode:(import.meta.env.VITE_APP_MODE||(import.meta.env.DEV?'demo':'unconfigured'));
const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY;
const validUrl=(()=>{try{const parsed=new URL(url);return !parsed.username&&!parsed.password&&(parsed.protocol==='https:'||import.meta.env.DEV&&parsed.protocol==='http:'&&['localhost','127.0.0.1'].includes(parsed.hostname));}catch{return false;}})();
export const configError=!['demo','supabase'].includes(mode)||(mode==='supabase'&&(!url||!key||!validUrl));
export const supabase=mode==='supabase'&&!configError&&url&&key?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export function switchMode(next:'demo'|'supabase'){if(demoOnly&&next!=='demo')return;sessionStorage.setItem('bb-mode-v2',next);location.assign('/');}
