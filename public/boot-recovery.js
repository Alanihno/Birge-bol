(function(){
 window.addEventListener('error',function(event){
  var target=event.target;if(!(target instanceof HTMLScriptElement)||!target.src.includes('/assets/')||!navigator.onLine)return;
  var version=document.querySelector('meta[name=app-version]')?.content||'entry';
  try{var key='bb-entry-recovery:'+version;if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,'1');location.reload();}catch{}
 },true);
})();
