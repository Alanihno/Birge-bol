import { safeError } from './safe-error';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApp } from './app-context';
import { mode, supabase } from './backend';
import { demoCommand, demoSnapshot, demoFamily, demoNotices, markDemoNotices } from './care-demo';
import type { CareState } from '../domain/care';
export async function careCommand(user:string,action:string,p:Record<string,unknown>={}) {
 if(mode==='demo')return demoCommand(user,action,p);
 if(!supabase)throw Error('Нет подключения к базе');
 const response=action==='specialist_qr'?await supabase.rpc('care_specialist_qr',{p_rotate:!!p.rotate}):action==='confirm_qr'?await supabase.rpc('care_confirm_qr',{p_code:String(p.code||''),p_appointment_id:typeof p.appointment_id==='string'?p.appointment_id:undefined}):action==='calendar_link'?await supabase.rpc('care_calendar_link',{p_revoke:!!p.revoke}):action==='book'?await supabase.rpc('care_book_slot',{p}):action==='review'?await supabase.rpc('care_submit_review',{p}):await supabase.rpc('care_command',{p_action:action,p});
 const {data,error}=response;
 if(error)throw Error(error.message.includes('exclusion')||error.code==='23P01'?'Это время уже занято. Выберите другое окно.':safeError(error));
 if(data && typeof data==='object' && !Array.isArray(data) && data.error)throw Error(safeError(data.error));
 return data as Record<string,unknown>;
}
export function useCare(){
 const {userId}=useApp(),qc=useQueryClient();
 const query=useQuery<CareState>({queryKey:['care',mode,userId],enabled:!!userId,queryFn:async()=>{
  if(mode==='demo')return demoSnapshot(userId!);
  const {data,error}=await supabase!.rpc('care_snapshot');if(error)throw Error(error.message);return data;
 },refetchInterval:4000,refetchOnWindowFocus:true,staleTime:2000});
 async function act(action:string,p:Record<string,unknown>={}){if(!userId)throw Error('Войдите в аккаунт');const data=await careCommand(userId,action,p);await Promise.all([qc.invalidateQueries({queryKey:['care']}),qc.invalidateQueries({queryKey:['personal']}),qc.invalidateQueries({queryKey:['catalog']}),qc.invalidateQueries({queryKey:['ratings']})]);return data;}
 return {...query,act};
}
export async function familyTask(token:string){if(mode==='demo')return demoFamily(token);const {data,error}=await supabase!.rpc('family_task',{p_token:token});if(error)throw Error(error.message);return data;}
export function useNotices(){const app=useApp();const q=useQuery({queryKey:['care','notices',app.userId],enabled:!!app.userId&&mode==='demo',queryFn:async()=>demoNotices(app.userId!),refetchInterval:8000});return {notices:[...app.data.notifications,...(q.data||[])],mark:async(id?:string)=>{if(mode==='demo'&&app.userId)markDemoNotices(app.userId,id);}};}
