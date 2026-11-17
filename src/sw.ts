/// <reference lib="webworker" />
import {setCacheNameDetails,cacheNames,clientsClaim} from 'workbox-core';
import {precacheAndRoute,matchPrecache} from 'workbox-precaching';
import {registerRoute} from 'workbox-routing';
import type {ManifestEntry} from 'workbox-build';
declare const self:ServiceWorkerGlobalScope&{__WB_MANIFEST:ManifestEntry[]};
declare const __BB_BUILD_ID__:string;
setCacheNameDetails({prefix:'birge-bol',suffix:__BB_BUILD_ID__});
clientsClaim();
// Fresh HTML online; the installed app shell remains available offline.
registerRoute(({request})=>request.mode==='navigate',async({request})=>{
 try{const response=await fetch(new Request(request,{cache:'no-store'}));if(response.ok)return response;if(response.status<500)return response;}catch{/* Offline app shell below. */}
 return await matchPrecache('/index.html')||new Response('Нет подключения к интернету',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
});
registerRoute(({url})=>url.origin===self.location.origin&&url.pathname==='/version.json',({request})=>fetch(new Request(request,{cache:'no-store'})));
registerRoute(({url})=>url.origin===self.location.origin&&url.pathname==='/boot-recovery.js',async({request})=>{try{const r=await fetch(new Request(request,{cache:'no-store'}));if(r.ok)return r;}catch{/* Offline bootstrap below. */}return await matchPrecache('/boot-recovery.js')||new Response('',{headers:{'Content-Type':'application/javascript'}});});
precacheAndRoute(self.__WB_MANIFEST);
// A previous tab can still request its old hashed chunks during a safe update.
registerRoute(({url})=>url.origin===self.location.origin&&url.pathname.startsWith('/assets/'),async({request})=>{
 const keys=await caches.keys();for(const name of keys.filter(n=>n.startsWith('birge-bol-')||n.startsWith('workbox-precache-'))){const cached=await(await caches.open(name)).match(request);if(cached)return cached;}
 return fetch(request);
});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')void self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const meta=await caches.open('birge-bol-update-metadata');const stored=await meta.match('/active-cache');const history: string[]=stored?await stored.json():[];
 const all=await caches.keys(),current=cacheNames.precache;
 const previous=history.find(n=>n!==current)||all.filter(n=>n.startsWith('workbox-precache-')).at(-1);
 const keep=new Set([current,previous,'birge-bol-update-metadata']);
 await Promise.all(all.filter(n=>(n.startsWith('birge-bol-precache-')||n.startsWith('workbox-precache-'))&&!keep.has(n)).map(n=>caches.delete(n)));
 await meta.put('/active-cache',new Response(JSON.stringify([current,...(previous?[previous]:[])])));
})()));
