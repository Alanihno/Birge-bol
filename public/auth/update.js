(async()=>{
 const status=document.getElementById('status'),kk=localStorage.getItem('bb-lang')==='kk';
 if(kk){document.documentElement.lang='kk';document.querySelector('h1').textContent='Birge Bol жаңартылуда';status.textContent='Профиль мен жазбалар сақталады.';}
 const next=new URLSearchParams(location.search).get('next')||'/';
 const ok=await window.__birgeRecover?.({manual:true,next});
 if(!ok)status.textContent=kk?'Жаңарту орындалмады. Интернетті тексеріп, қайталаңыз.':'Не удалось обновить файлы. Проверьте подключение и повторите.';
})();
