import {tr,useLocale} from './i18n';
import {createContext,useContext,useEffect,useEffectEvent,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {hasEditedForms,installDraftProtection,saveDrafts,updateBlockReason} from './update-safety';
type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone===true;
function usePwaState(){
 const [installEvent,setInstallEvent]=useState<InstallEvent|null>(null),[installed,setInstalled]=useState(standalone),[installError,setInstallError]=useState(''),[registrationError,setRegistrationError]=useState(false);
 const [needRefresh,setNeedRefresh]=useState(false),[offlineReady,setOfflineReady]=useState(false),[warning,setWarning]=useState(''),[updating,setUpdating]=useState(false);
 const registration=useRef<ServiceWorkerRegistration|null>(null),changedController=useRef(false),refresh=useRef(false);
 const secure=window.isSecureContext&&(location.protocol==='https:'||['localhost','127.0.0.1','[::1]'].includes(location.hostname));
 const setAvailable=()=>{refresh.current=true;setNeedRefresh(true);};
 function reloadSafely(){const reason=updateBlockReason();if(reason){setWarning(reason);setAvailable();setUpdating(false);return false;}saveDrafts();const key='bb-sw-reloaded:'+__BB_BUILD_ID__;if(sessionStorage.getItem(key)){setUpdating(false);return false;}sessionStorage.setItem(key,'1');location.reload();return true;}
 async function updateServiceWorker(_reload=true){void _reload;const reason=updateBlockReason();if(reason){setWarning(reason);return;}if(!navigator.onLine){setWarning('Для обновления подключитесь к интернету.');return;}saveDrafts();setWarning('');setUpdating(true);
  if(changedController.current){reloadSafely();return;}
  try{await registration.current?.update();let next=registration.current?.waiting;const installing=registration.current?.installing;
   if(!next&&installing){await new Promise<void>((resolve,reject)=>{const done=()=>{if(installing.state==='installed'||installing.state==='redundant'){clearTimeout(timer);installing.removeEventListener('statechange',done);if(installing.state==='installed')resolve();else reject(new Error('install'));}};const timer=setTimeout(()=>{installing.removeEventListener('statechange',done);reject(new Error('timeout'));},20000);installing.addEventListener('statechange',done);done();});next=registration.current?.waiting||(installing.state==='installed'?installing:null);}
   const blocked=updateBlockReason();if(blocked){setWarning(blocked);setUpdating(false);return;}saveDrafts();
   if(next)next.postMessage({type:'SKIP_WAITING'});else{setUpdating(false);if(refresh.current)setWarning('Новая версия загружается. Повторите обновление через несколько секунд.');}}
  catch{setUpdating(false);setWarning('Не удалось проверить обновление. Повторите позже.');}
 }
 const reloadFromEffect=useEffectEvent(reloadSafely),updateFromEffect=useEffectEvent(updateServiceWorker);
 useEffect(()=>installDraftProtection(),[]);
 useEffect(()=>{
  if(!secure||!('serviceWorker'in navigator)||import.meta.env.DEV)return;
  let disposed=false,auto:ReturnType<typeof setTimeout>|undefined,hadController=!!navigator.serviceWorker.controller;
  const found=()=>{const reg=registration.current;if(!reg?.installing)return;const worker=reg.installing;worker.addEventListener('statechange',()=>{if(disposed||worker.state!=='installed')return;if(navigator.serviceWorker.controller){setAvailable();auto=setTimeout(()=>{if(!hasEditedForms()&&!updateBlockReason())void updateFromEffect();},8000);}else setOfflineReady(true);});};
  const check=async()=>{if(disposed||!navigator.onLine||document.visibilityState!=='visible')return;try{
    await registration.current?.update();if(registration.current?.waiting)setAvailable();
    const response=await fetch('/version.json',{cache:'no-store'});if(response.ok){const info=await response.json();if(info.buildId&&info.buildId!==__BB_BUILD_ID__){setAvailable();await registration.current?.update();}}
   }catch{/* An offline check must not break the running app. */}};
  const controlling=()=>{if(!hadController){hadController=true;setOfflineReady(true);return;}changedController.current=true;setAvailable();reloadFromEffect();};
  navigator.serviceWorker.addEventListener('controllerchange',controlling);
  navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(reg=>{if(disposed)return;registration.current=reg;reg.addEventListener('updatefound',found);if(reg.installing)found();if(reg.waiting)setAvailable();void check();}).catch(()=>{if(!disposed)setRegistrationError(true);});
  const tick=setInterval(()=>{void check();if(changedController.current&&!updateBlockReason())reloadFromEffect();},60000);
  const visible=()=>{void check();};window.addEventListener('online',visible);window.addEventListener('focus',visible);document.addEventListener('visibilitychange',visible);
  return()=>{disposed=true;if(auto)clearTimeout(auto);clearInterval(tick);registration.current?.removeEventListener('updatefound',found);navigator.serviceWorker.removeEventListener('controllerchange',controlling);window.removeEventListener('online',visible);window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible);};
 },[secure]);
 useEffect(()=>{
  const capture=(event:Event)=>{event.preventDefault();setInstallEvent(event as InstallEvent);setInstallError('');},completed=()=>{setInstalled(true);setInstallEvent(null);setInstallError('');},display=window.matchMedia('(display-mode: standalone)'),change=()=>setInstalled(standalone());
  window.addEventListener('beforeinstallprompt',capture);window.addEventListener('appinstalled',completed);display.addEventListener('change',change);
  return()=>{window.removeEventListener('beforeinstallprompt',capture);window.removeEventListener('appinstalled',completed);display.removeEventListener('change',change);};
 },[]);
 async function installApp(){if(!installEvent)return;const event=installEvent;setInstallEvent(null);setInstallError('');try{await event.prompt();await event.userChoice;}catch{setInstallError('Откройте сайт в Chrome или Safari и используйте меню установки.');}}
 return {needRefresh:[needRefresh,setNeedRefresh] as const,offlineReady:[offlineReady,setOfflineReady] as const,updateServiceWorker,installAvailable:!!installEvent,installApp,installed,secure,installError,registrationError,warning,updating};
}
const PwaContext=createContext<ReturnType<typeof usePwaState>|null>(null);
export function PwaProvider({children}:{children:ReactNode}){useLocale();const value=usePwaState();return <PwaContext.Provider value={value}>{children}{value.needRefresh[0]&&<aside className="pwa-update" role="status" aria-live="polite"><strong>{tr('Доступна новая версия')}</strong><p>{tr(value.warning||'Текст заполненных форм сохранится при обновлении.')}</p><button className="btn primary" disabled={value.updating} onClick={()=>void value.updateServiceWorker()}>{tr(value.updating?'Обновляем…':'Обновить')}</button></aside>}</PwaContext.Provider>;}
export function usePwa(){const state=useContext(PwaContext);if(!state)throw new Error('PwaProvider is required');return state;}
