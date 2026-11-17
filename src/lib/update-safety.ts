/** Per-tab, short-lived drafts. Credentials and selected files are never serialized. */
type Control=HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement;
type Draft={label:string;index:number;tag:string;type:string;name:string;value:string;checked?:boolean};
type Saved={owner:string;route:string;at:number;fields:Draft[]};
let owner='guest',child='',pendingMutations=()=>false;
const touched=new WeakSet<Element>();
const controls=()=>Array.from(document.querySelectorAll<Control>('input,textarea,select')).filter(e=>!['password','file','hidden'].includes(e instanceof HTMLInputElement?e.type:''));
const label=(e:Control)=>e.getAttribute('aria-label')||Array.from(e.labels?.[0]?.childNodes||[]).filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join('').trim();
const route=()=>location.pathname+location.search;
const key=()=>`bb-update-draft:${owner}:${child}:${route()}`;
export function setDraftScope(user:string|null,childId:string){owner=user||'guest';child=childId;restoreDrafts();}
export function clearPrivateDrafts(){for(const k of Object.keys(sessionStorage))if(k.startsWith('bb-update-draft:'))sessionStorage.removeItem(k);inheritedDrafts.clear();}
export function setPendingMutations(check:()=>boolean){pendingMutations=check;}
export function updateBlockReason(){
 if(pendingMutations()||Array.from(document.querySelectorAll('[aria-busy="true"]')).some(e=>!e.closest('.pwa-update')))return 'Дождитесь сохранения текущего действия.';
 if(Array.from(document.querySelectorAll<HTMLInputElement>('input[type=file]')).some(e=>!!e.files?.length))return 'Сначала отправьте или отмените выбранные файлы.';
 if(/^\/(auth|register)/.test(location.pathname)&&Array.from(document.querySelectorAll<HTMLInputElement>('input[type=password]')).some(e=>!!e.value))return 'Завершите вход перед обновлением.';
 if(document.querySelector('[role=dialog]')&&controls().some(e=>touched.has(e)&&!!e.closest('[role=dialog]')))return 'Сохраните или закройте заполненную форму перед обновлением.';
 return '';
}
export function hasEditedForms(){return controls().some(e=>touched.has(e));}
export function saveDrafts(){
 const fields=controls().flatMap((e,index)=>touched.has(e)?[{label:label(e),index,tag:e.tagName,type:e instanceof HTMLInputElement?e.type:'',name:e.name||e.id||'',value:e.value,...(e instanceof HTMLInputElement&&['checkbox','radio'].includes(e.type)?{checked:e.checked}:{})}]:[]);
 try{if(fields.length)sessionStorage.setItem(key(),JSON.stringify({owner,route:route(),at:Date.now(),fields} satisfies Saved));else sessionStorage.removeItem(key());}catch{/* A full/private browser must not clear existing application data. */}
}
let restoring=false;
// Restore only drafts inherited from a previous document, never a draft that this
// running page just saved. Otherwise a DOM change could resurrect a submitted form.
const inheritedDrafts=new Map<string,Saved>();
let draftsLoaded=false;
function loadInheritedDrafts(){
 if(draftsLoaded)return;draftsLoaded=true;
 try{for(let i=0;i<sessionStorage.length;i++){const k=sessionStorage.key(i);if(!k?.startsWith('bb-update-draft:'))continue;try{const saved=JSON.parse(sessionStorage.getItem(k)||'null');if(saved?.fields)inheritedDrafts.set(k,saved);}catch{/* Ignore an invalid local draft. */}}}catch{/* Storage unavailable. */}
}
export function restoreDrafts(){
 if(restoring)return;
 const draftKey=key(),saved=inheritedDrafts.get(draftKey);
 if(!saved||saved.owner!==owner||saved.route!==route())return;
 if(Date.now()-saved.at>2*3600000){inheritedDrafts.delete(draftKey);sessionStorage.removeItem(draftKey);return;}
 restoring=true;
 const elements=controls();const remaining:Draft[]=[];
 for(const field of saved.fields){const e=elements[field.index];if(!e||e.tagName!==field.tag||(e.name||e.id||'')!==field.name||label(e)!==field.label){remaining.push(field);continue;}
  if(touched.has(e))continue;
  const proto=e instanceof HTMLInputElement?HTMLInputElement.prototype:e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLSelectElement.prototype;
  if(field.checked!==undefined&&e instanceof HTMLInputElement){if(e.checked!==field.checked)e.click();}
  else Object.getOwnPropertyDescriptor(proto,'value')?.set?.call(e,field.value);
  touched.add(e);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));
 }
 if(remaining.length)inheritedDrafts.set(draftKey,{...saved,fields:remaining});else inheritedDrafts.delete(draftKey);
 try{const stored=JSON.parse(sessionStorage.getItem(draftKey)||'null');if(stored?.at===saved.at){if(remaining.length)sessionStorage.setItem(draftKey,JSON.stringify({...saved,fields:remaining}));else sessionStorage.removeItem(draftKey);}}catch{/* Storage unavailable. */}
 restoring=false;
}
export function installDraftProtection(){
 loadInheritedDrafts();restoreDrafts();
 const input=(event:Event)=>{if(restoring||!(event.target instanceof HTMLElement))return;touched.add(event.target);saveDrafts();};
 document.addEventListener('input',input,true);document.addEventListener('change',input,true);
 const observer=new MutationObserver(()=>{restoreDrafts();if(!inheritedDrafts.has(key()))saveDrafts();});observer.observe(document.documentElement,{subtree:true,childList:true});
 window.addEventListener('pagehide',saveDrafts);
 return()=>{document.removeEventListener('input',input,true);document.removeEventListener('change',input,true);observer.disconnect();window.removeEventListener('pagehide',saveDrafts);};
}
export function isModuleLoadError(error:unknown){const value=error instanceof Error?error.message:String(error);return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .* failed|Failed to load module script/i.test(value);}
export function recoverModuleLoad(){
 if(!navigator.onLine)return false;
 const guard=`bb-preload-recovery:${__BB_BUILD_ID__}`;
 if(sessionStorage.getItem(guard)||updateBlockReason())return false;
 saveDrafts();sessionStorage.setItem(guard,'1');
 const recover=(window as Window&{__birgeRecover?:()=>Promise<boolean>}).__birgeRecover;
 if(recover)void recover();else location.reload();return true;
}
export function installModuleRecovery(){
 window.addEventListener('vite:preloadError',event=>{if(recoverModuleLoad())event.preventDefault();});
 window.addEventListener('unhandledrejection',event=>{if(isModuleLoadError(event.reason)&&recoverModuleLoad())event.preventDefault();});
}
