const fs=require('fs');
const edit=(f,fn)=>fs.writeFileSync(f,fn(fs.readFileSync(f,'utf8')));
edit('vite.config.ts',s=>s.replace("registerType:'prompt'","registerType:'autoUpdate'").replace('workbox:{navigateFallback:',"workbox:{skipWaiting:true,clientsClaim:true,navigateFallback:"));
edit('src/lib/pwa-context.tsx',s=>s.replace("const worker=useRegisterSW({onRegisterError:()=>setRegistrationError(true)});",`const worker=useRegisterSW({onRegisterError:()=>setRegistrationError(true),onRegisteredSW:(_url,registration)=>{if(!registration)return;void registration.update().catch(()=>{});const check=()=>{if(document.visibilityState==='visible')void registration.update().catch(()=>{});};document.addEventListener('visibilitychange',check);}});`));
edit('src/components/layout.tsx',s=>s.replace('<span className="tiny">Birge Bol · MVP 0.1</span>','<a className="sidebar-help" href="/auth/update.html">Обновить приложение</a><span className="tiny">Birge Bol · версия 12.11.2</span>'));
edit('vercel.json',s=>{const c=JSON.parse(s);c.rewrites[0].source=c.rewrites[0].source.replace('assets/|','auth/update\\.(?:html|js)|assets/|');c.headers.push({source:'/auth/update.html',headers:[{key:'Cache-Control',value:'no-store'}]},{source:'/auth/update.js',headers:[{key:'Cache-Control',value:'no-store'}]});return JSON.stringify(c);});
console.log('Automatic PWA updates and recovery route ready');
