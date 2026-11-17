import {setDraftScope} from './update-safety';
import { tr } from '../lib/i18n';
import { demoAccounts, roleHome } from '../domain/care';
import type { Role } from '../domain/care';
import { demoIdentity, ensureDemoRole } from './care-demo';
import { setLocale } from './i18n';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mode, supabase } from './backend';
import { repository } from './repository';
import { demoChild, emptyPersonal } from '../domain/data';
import type { Child } from '../domain/types';
const dictionary={ru:{find:'Найти',moms:'Мамы',child:'Мой ребёнок',favorites:'Избранное',explain:'Простым языком',settings:'Настройки',profile:'Мой профиль',notifications:'Уведомления',login:'Войти',city:'Алматы',demo:"режим",tagline:'Найти. Понять. Видеть прогресс.',back:'Назад',save:'Сохранить',cancel:'Отмена',search:'Поиск специалистов',intro:'Рядом на каждом шаге',admin:'Модерация',help:'Знакомство с Birge Bol'},kk:{find:'Маман табу',moms:'Аналар',child:'Менің балам',favorites:'Таңдаулылар',explain:'Қарапайым тілмен',settings:'Баптаулар',profile:'Менің профилім',notifications:'Хабарламалар',login:'Кіру',city:'Алматы',demo:"режим",tagline:'Табу. Түсіну. Ілгерілеуді көру.',back:'Артқа',save:'Сақтау',cancel:'Бас тарту',search:'Мамандарды іздеу',intro:'Әр қадамда қасыңызда',admin:'Модерация',help:'Birge Bol-мен танысу'}};
export function useAppState(){const qc=useQueryClient();const [userId,setUserId]=useState<string|null>(mode==='demo'?demoIdentity()?.id||null:null);const [role,setRole]=useState<Role>(mode==='demo'?demoIdentity()?.role||'parent':'parent');const [roleReady,setRoleReady]=useState(mode==='demo');const [authReady,setAuthReady]=useState(mode==='demo');const [lang,setLangState]=useState<'ru'|'kk'>(localStorage.getItem('bb-lang')==='kk'?'kk':'ru');const [activeId,setActiveId]=useState(sessionStorage.getItem('bb-active-child')||'');const [draft,setDraftState]=useState<Child>(()=>{try{return JSON.parse(sessionStorage.getItem('bb-onboarding')||'null')||demoChild;}catch{return demoChild;}});const [toast,setToast]=useState('');const [visitCode,setVisitCode]=useState<{id:string;code:string}|null>(null);
 useEffect(()=>{if(mode==='demo')return;if(!supabase){setAuthReady(true);return;}let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setUserId(data.session?.user.id||null);setAuthReady(true);}});const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{setUserId(session?.user.id||null);setAuthReady(true);qc.removeQueries({queryKey:['personal']});});return()=>{alive=false;subscription.unsubscribe();};},[qc]);
 useEffect(()=>{if(mode==='demo'){setRoleReady(true);return;}if(!userId||!supabase){setRoleReady(true);return;}let alive=true;setRoleReady(false);void (async()=>{const {data,error}=await supabase.from('user_roles').select('role').eq('user_id',userId).maybeSingle();if(error){if(alive)setToast('Не удалось проверить роль. Повторите вход.');return;}let next=data?.role;if(!next){const pending=sessionStorage.getItem('bb-signup-role')||localStorage.getItem('bb-signup-role')||'parent';const r=await supabase.rpc('register_care_role',{p_role:pending});if(r.error){if(alive)setToast('Не удалось создать кабинет');return;}next=r.data;}if(alive){setRole(next as Role);setRoleReady(true);sessionStorage.removeItem('bb-signup-role');localStorage.removeItem('bb-signup-role');}})();return()=>{alive=false;};},[userId]);
 useEffect(()=>{const change=()=>{void qc.invalidateQueries({queryKey:['care']});void qc.invalidateQueries({queryKey:['personal']});};window.addEventListener('storage',change);window.addEventListener('bb-care-change',change);return()=>{window.removeEventListener('storage',change);window.removeEventListener('bb-care-change',change);};},[qc]);
 useEffect(()=>{
  if(mode!=='supabase'||!supabase||!userId)return;
  const client=supabase;let timer:ReturnType<typeof setTimeout>|undefined;
  const refreshSlots=()=>{clearTimeout(timer);timer=setTimeout(()=>{void qc.invalidateQueries({queryKey:['care']});},100);};
  const channel=client.channel('availability:'+userId).on('postgres_changes',{event:'*',schema:'public',table:'schedule_slots'},refreshSlots).subscribe(status=>{if(status==='SUBSCRIBED')refreshSlots();});
  return()=>{clearTimeout(timer);void client.removeChannel(channel);};
 },[qc,userId]);
 useEffect(()=>{setLocale(lang);},[lang]);
 useEffect(()=>{if(!toast)return;const timeout=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(timeout);},[toast]);
 const personal=useQuery({queryKey:['personal',mode,userId],queryFn:()=>repository.personal(userId!),enabled:!!userId,staleTime:4000,refetchInterval:4000,refetchOnWindowFocus:true});
 const data=personal.data||emptyPersonal();const activeChild=data.children.find(c=>c.id===activeId)||data.children[0]||draft;
 const refresh=useCallback(()=>qc.invalidateQueries({queryKey:['personal',mode,userId]}),[qc,userId]);
 function demoLogin(nextRole:Role='parent',email?:string){const a=demoAccounts.find(a=>a.role===nextRole)||demoAccounts[0];const identity={id:a.id,role:a.role,email:email||a.email};localStorage.setItem('bb-demo-session','yes');sessionStorage.setItem('bb-demo-identity',JSON.stringify(identity));ensureDemoRole(identity.id,identity.role);setRole(identity.role);setRoleReady(true);setUserId(identity.id);qc.clear();}
 async function logout(){if(mode==='supabase'&&supabase){const {error}=await supabase.auth.signOut();if(error){setToast('Не удалось завершить сеанс. Проверьте сеть и повторите.');return false;}}localStorage.removeItem('bb-demo-session');sessionStorage.removeItem('bb-demo-identity');localStorage.removeItem('bb-demo-identity');setUserId(null);setVisitCode(null);setActiveId('');sessionStorage.removeItem('bb-active-child');sessionStorage.removeItem('bb-onboarding');sessionStorage.removeItem('bb-auth-next');setDraftState(demoChild);qc.clear();return true;}
 function setDraft(child:Child){setDraftState(child);sessionStorage.setItem('bb-onboarding',JSON.stringify(child));}
 function setActive(id:string){setActiveId(id);sessionStorage.setItem('bb-active-child',id);}
 function setLang(value:'ru'|'kk'){setLangState(value);setLocale(value);}
 return {visitCode,setVisitCode,userId,authReady:authReady&&roleReady,role,home:roleHome(role),personal,data,activeChild,draft,setDraft,setActive,refresh,demoLogin,logout,lang,setLang,t:dictionary[lang],toast,notify:setToast};}
type AppState=ReturnType<typeof useAppState>;
const AppContext=createContext<AppState|null>(null);
export function AppProvider({children}:{children:ReactNode}){const state=useAppState();useEffect(()=>{setDraftScope(state.userId,state.activeChild.id);},[state.userId,state.activeChild.id]);return <AppContext.Provider value={state}>{tr(children)}</AppContext.Provider>;}
export function useApp(){const value=useContext(AppContext);if(!value)throw new Error('AppProvider is required');return value;}
