(function(){
 var active=false,watchdog,rootObserver;
 var repairPage=location.pathname==='/auth/update.html';
 function isAppCache(name){return name.indexOf('birge-bol-')===0||(name.indexOf('workbox-precache-')===0&&name.endsWith(location.origin+'/'));}
 function showRecovery(message){
  if(document.getElementById('bb-boot-recovery'))return;
  var panel=document.createElement('aside');panel.id='bb-boot-recovery';panel.setAttribute('role','alert');
  panel.style.cssText='position:fixed;inset:20% 16px auto;max-width:540px;margin:auto;padding:24px;border-radius:20px;background:#fff;color:#4B0073;border:2px solid #C8AAFF;font:16px/1.5 system-ui;z-index:99999';
  var title=document.createElement('h1');title.textContent='Не удалось загрузить Birge Bol';
  var text=document.createElement('p');text.textContent=message||'Обновите файлы приложения. Аккаунт и сохранённые записи останутся.';
  var button=document.createElement('button');button.type='button';button.textContent='Восстановить загрузку';button.style.cssText='font:inherit;padding:12px;border-radius:12px;background:#4B0073;color:#fff;border:0;cursor:pointer';
  button.onclick=function(){button.disabled=true;void recover({manual:true}).then(function(ok){if(!ok){button.disabled=false;text.textContent='Не удалось обновить файлы. Проверьте подключение и повторите.';}});};
  panel.append(title,text,button);document.body.append(panel);
 }
 async function recover(options){
  options=options||{};if(active||!navigator.onLine)return false;active=true;var timeout;
  try{
   // Confirm that the release is reachable before removing offline files.
   var probe=new URL('/version.json',location.origin);probe.searchParams.set('bb-check',String(Date.now()));
   var controller=new AbortController();timeout=setTimeout(function(){controller.abort();},8000);
   var response=await fetch(probe.href,{cache:'no-store',credentials:'same-origin',signal:controller.signal});
   if(!response.ok)throw Error('release unavailable');var version=(await response.json()).buildId;
   if(typeof version!=='string'||!/^[a-zA-Z0-9._-]{1,100}$/.test(version))throw Error('invalid release');
   var target=new URL(options.next||location.href,location.origin);
   if(target.origin!==location.origin||target.username||target.password||target.pathname==='/auth/update.html')target=new URL('/',location.origin);
   var key='bb-boot-recovery:'+version,already=false;
   try{var previous=Number(sessionStorage.getItem(key));already=previous>0&&Date.now()-previous<600000;}catch{/* URL guard also works when storage is unavailable. */}
   if(!options.manual&&(already||new URL(location.href).searchParams.get('__bb_recover')===version)){showRecovery('Автоматическое восстановление уже выполнено. Повторите вручную или проверьте подключение.');return false;}
   try{sessionStorage.setItem(key,String(Date.now()));}catch{/* Credentials and app storage are never cleared. */}
   if('serviceWorker'in navigator){var registrations=await navigator.serviceWorker.getRegistrations();await Promise.all(registrations.filter(function(r){return r.scope===location.origin+'/';}).map(function(r){return r.unregister();}));}
   if('caches'in window){var names=await caches.keys();await Promise.all(names.filter(isAppCache).map(function(name){return caches.delete(name);}));}
   // Keep the route, query, Auth callback and fragment on the same origin.
   target.searchParams.set('__bb_recover',version);location.replace(target.href);return true;
  }catch{showRecovery('Не удалось проверить новую версию. Проверьте подключение и повторите.');return false;}
  finally{clearTimeout(timeout);active=false;}
 }
 window.__birgeRecover=recover;
 function blank(){var root=document.getElementById('root');return root&&!root.hasChildNodes();}
 function entryFailed(){if(blank())void recover(repairPage?{manual:true,next:new URLSearchParams(location.search).get('next')||'/'}:undefined);}
 window.addEventListener('error',function(event){var target=event.target;if(target instanceof HTMLScriptElement&&target.src.indexOf('/assets/')!==-1)entryFailed();else if(target===window)entryFailed();},true);
 window.addEventListener('unhandledrejection',entryFailed);
 function loaded(){
  if(repairPage){if(!document.getElementById('status'))entryFailed();return;}
  function rendered(){if(blank())return;clearTimeout(watchdog);rootObserver?.disconnect();var url=new URL(location.href);if(url.searchParams.has('__bb_recover')){url.searchParams.delete('__bb_recover');history.replaceState(history.state,'',url.href);}}
  rootObserver=new MutationObserver(rendered);var root=document.getElementById('root');if(root)rootObserver.observe(root,{childList:true});
  watchdog=setTimeout(function(){if(blank()){showRecovery();if(navigator.serviceWorker?.controller)void recover();}},15000);rendered();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loaded,{once:true});else loaded();
})();
