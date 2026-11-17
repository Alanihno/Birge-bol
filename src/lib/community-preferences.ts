import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useApp} from './app-context';
import {mode,supabase} from './backend';
export function useCommunityPreferences(){const app=useApp(),qc=useQueryClient(),key='bb-community-'+app.userId;
 const query=useQuery({queryKey:['community-preferences',app.userId],enabled:!!app.userId,queryFn:async()=>{if(mode==='demo')return JSON.parse(localStorage.getItem(key)||'{"topics":[],"notify_new":false}') as {topics:string[];notify_new:boolean};const r=await supabase!.from('community_preferences').select('topics,notify_new').eq('user_id',app.userId!).maybeSingle();if(r.error)throw Error(r.error.message);return r.data||{topics:[],notify_new:false};}});
 async function save(value:{topics:string[];notify_new:boolean}){if(!app.userId)return;if(mode==='demo')localStorage.setItem(key,JSON.stringify(value));else{const r=await supabase!.from('community_preferences').upsert({user_id:app.userId,...value});if(r.error)throw Error(r.error.message);}qc.setQueryData(['community-preferences',app.userId],value);await qc.invalidateQueries({queryKey:['personal']});}
 return {...query,save};}
