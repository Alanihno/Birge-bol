import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';

let server:ReturnType<typeof createServer>,base='',broken=false,failVersion=false,navigations=0;
const stale='<!doctype html><html><head><meta charset="utf-8"><meta name="app-version" content="legacy-broken"><script src="/boot-recovery.js"></script><script type="module" src="/assets/removed-legacy-entry.js"></script></head><body><div id="root"></div></body></html>';
test.beforeAll(async()=>{
 server=createServer((req,res)=>{
  const url=new URL(req.url||'/','http://local');res.setHeader('Cache-Control','no-store');
  if(url.pathname==='/version.json'&&failVersion){res.writeHead(503);res.end();return;}
  if(url.pathname==='/legacy-install.html'){res.setHeader('Content-Type','text/html');res.end('<script>window.installed=navigator.serviceWorker.register("/legacy-worker.js").then(()=>navigator.serviceWorker.ready)</script>');return;}
  if(url.pathname==='/legacy-worker.js'){res.setHeader('Content-Type','application/javascript');res.end(`self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open('birge-bol-precache-legacy');await c.put('/legacy-shell',new Response(${JSON.stringify(stale)},{headers:{'Content-Type':'text/html'}}));await self.skipWaiting();})()));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{if(e.request.mode==='navigate')e.respondWith(caches.open('birge-bol-precache-legacy').then(c=>c.match('/legacy-shell')));});`);return;}
  if(url.pathname==='/assets/removed-legacy-entry.js'){res.writeHead(404);res.end();return;}
  const root=resolve('dist-demo'),file=resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+sep)&&file!==root){res.writeHead(403);res.end();return;}
  let asset=file;if(!existsSync(asset)||statSync(asset).isDirectory()){if(url.pathname.startsWith('/assets/')){res.writeHead(404);res.end();return;}asset=resolve(root,'index.html');}
  const types:Record<string,string>={'.js':'application/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
  res.setHeader('Content-Type',types[extname(asset)]||'application/octet-stream');
  if(extname(asset)==='.html'){navigations++;res.end(broken?stale:readFileSync(asset));}else res.end(readFileSync(asset));
 });await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();if(!address||typeof address==='string')throw Error('Server missing');base='http://127.0.0.1:'+address.port;
});
test.afterAll(async()=>{await new Promise<void>(r=>server.close(()=>r()));});
test('an existing browser with a stale worker and missing entry recovers without losing account storage',async({page})=>{
 broken=false;await page.goto(base+'/legacy-install.html');await page.evaluate(async()=>{await (window as Window&{installed?:Promise<unknown>}).installed;localStorage.setItem('sb-test-auth-token','preserve-existing-session');localStorage.setItem('bb-lang','ru');sessionStorage.setItem('bb-private-draft','preserve-draft');await caches.open('unrelated-user-data');document.cookie='keep_user_cookie=yes; Path=/';});
 await page.goto(base+'/auth?next=%2Fpayments#keep-fragment');
 await expect(page.getByRole('heading',{name:'Давайте познакомимся',exact:true})).toBeVisible({timeout:20000});
 expect(new URL(page.url()).pathname).toBe('/auth');expect(new URL(page.url()).searchParams.get('next')).toBe('/payments');expect(new URL(page.url()).hash).toBe('#keep-fragment');
 expect(await page.evaluate(()=>localStorage.getItem('sb-test-auth-token'))).toBe('preserve-existing-session');expect(await page.evaluate(()=>sessionStorage.getItem('bb-private-draft'))).toBe('preserve-draft');expect(await page.evaluate(()=>document.cookie)).toContain('keep_user_cookie=yes');
 const keys=await page.evaluate(()=>caches.keys());expect(keys).not.toContain('birge-bol-precache-legacy');expect(keys).toContain('unrelated-user-data');
});
test('a still broken release stops after one recovery instead of looping',async({page})=>{
 broken=true;navigations=0;await page.goto(base+'/auth');await expect(page.getByRole('button',{name:'Восстановить загрузку',exact:true})).toBeVisible({timeout:15000});await expect.poll(()=>navigations).toBe(2);await page.waitForTimeout(1000);expect(navigations).toBe(2);broken=false;
});
test('an unavailable release keeps offline files and the existing worker',async({page})=>{
 failVersion=true;try{await page.goto(base+'/legacy-install.html');await page.evaluate(async()=>{await (window as Window&{installed?:Promise<unknown>}).installed;});await page.goto(base+'/auth');await expect(page.getByRole('button',{name:'Восстановить загрузку',exact:true})).toBeVisible();expect(await page.evaluate(()=>caches.keys())).toContain('birge-bol-precache-legacy');expect(await page.evaluate(async()=>!!await navigator.serviceWorker.getRegistration())).toBe(true);}finally{failVersion=false;}
});
test('the recovery URL also escapes an old worker that intercepts that URL',async({page})=>{
 await page.goto(base+'/legacy-install.html');await page.evaluate(async()=>{await (window as Window&{installed?:Promise<unknown>}).installed;});await page.goto(base+'/auth/update.html?next=%2Fauth');await expect(page.getByRole('heading',{name:'Давайте познакомимся',exact:true})).toBeVisible({timeout:20000});expect(new URL(page.url()).pathname).toBe('/auth');
});
