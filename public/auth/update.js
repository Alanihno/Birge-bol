(async()=>{
  const requested=new URLSearchParams(location.search).get('lang');if(requested==='kk'||requested==='ru')localStorage.setItem('bb-lang',requested);const status=document.getElementById('status');const kk=localStorage.getItem('bb-lang')==='kk';if(kk){document.documentElement.lang='kk';document.querySelector('h1').textContent='Birge Bol жаңартылуда';status.textContent='Профиль мен жазбалар сақталады.';}
  try{
    if('serviceWorker' in navigator){
      const registrations=await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.filter(r=>r.scope===new URL('/',location.origin).href).map(r=>r.unregister()));
    }
    if('caches' in window){
      const names=await caches.keys();
      await Promise.all(names.filter(name=>name.startsWith('workbox-precache-')).map(name=>caches.delete(name)));
    }
    // Fetch the current document from the network after removing the old registration.
    status.textContent=kk?'Дайын. Жаңа нұсқа ашылуда…':'Готово. Открываем новую версию…';
    location.replace('/?version=20261112.4');
  }catch{
    status.textContent=kk?'Жаңарту орындалмады. Интернетті тексеріп, сілтемені қайта ашыңыз.':'Не удалось обновить приложение. Проверьте интернет и откройте эту ссылку ещё раз.';
  }
})();
