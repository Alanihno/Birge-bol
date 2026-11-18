import { supabase } from './backend';
function publicKeyBytes(key:string){const raw=atob(key.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
export async function pushRegistration(){const registration=await navigator.serviceWorker.getRegistration();if(!registration?.active)throw Error('Не удалось открыть модуль уведомлений. Обновите приложение.');return registration;}
export async function pushConfig(){if(!supabase)return {enabled:false,public_key:''};const {data,error}=await supabase.rpc('push_public_config');if(error)throw Error('Не удалось проверить настройки уведомлений');return data as {enabled:boolean;public_key:string};}
export async function testPush(){if(!supabase)throw Error('Нет подключения к базе');const {data,error}=await supabase.functions.invoke('push-dispatch',{body:{test:true}});if(error){let message='Отправка временно недоступна';try{const body=await (error as {context:Response}).context.json();if(body.error)message=body.error;}catch{/* Safe fallback. */}throw Error(message);}return data as {sent:number;failed:number};}
export async function subscribePush(userId:string,publicKey?:string){
 if(!supabase)throw Error('Нет подключения к базе');
 const key=publicKey||import.meta.env.VITE_VAPID_PUBLIC_KEY;if(!key)throw Error('Не удалось включить уведомления: сервер ещё не настроен.');
 const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Не удалось включить уведомления. Разрешите их в настройках браузера.');
 const registration=await pushRegistration();const subscription=await registration.pushManager.getSubscription()||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:publicKeyBytes(key)});
 const payload=subscription.toJSON();const result=await supabase.rpc('register_push_device',{p_endpoint:subscription.endpoint,p_p256dh:payload.keys?.p256dh,p_auth:payload.keys?.auth});
 if(result.error){await subscription.unsubscribe();throw Error('Не удалось сохранить подписку. Попробуйте позже.');}
 localStorage.setItem('bb-push-user',userId);return subscription;
}
export async function detachPush(){
 if(!('serviceWorker' in navigator)||!('PushManager' in window))return;
 const registration=await navigator.serviceWorker.getRegistration();const subscription=await registration?.pushManager.getSubscription();if(!subscription)return;
 // Unsubscribe even when offline, so the shared device cannot receive another account's pushes.
 await subscription.unsubscribe();
 if(supabase){const {error}=await supabase.rpc('remove_push_device',{p_endpoint:subscription.endpoint});if(error&&navigator.onLine)throw Error('Не удалось удалить серверную подписку. Повторите выход.');}
 localStorage.removeItem('bb-push-user');
}
