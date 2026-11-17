import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
let current='a',base='',server:ReturnType<typeof createServer>;
test.beforeAll(async()=>{
 server=createServer((req,res)=>{const root=resolve('.preview/pwa-'+current),url=new URL(req.url||'/', 'http://local'),path=resolve(root,'.'+decodeURIComponent(url.pathname));if(!path.startsWith(root+sep)&&path!==root){res.writeHead(403);res.end();return;}
  let file=path;if(!existsSync(file)||statSync(file).isDirectory()){if(url.pathname.startsWith('/assets/')){res.writeHead(404);res.end();return;}file=resolve(root,'index.html');}
  const types:Record<string,string>={'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json','.webm':'video/webm'};
  res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.setHeader('Cache-Control',url.pathname.startsWith('/assets/')?'public,max-age=31536000,immutable':'no-store');res.end(readFileSync(file));
 });await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();if(!address||typeof address==='string')throw Error('Server not started');base='http://127.0.0.1:'+address.port;
});
test.afterAll(async()=>{await new Promise<void>(r=>server.close(()=>r()));});
test('an update defers selected files and never serializes the password',async({page})=>{
 const fields=async()=>page.evaluate(()=>{const form=document.createElement('form');form.innerHTML='<label for="pwa-email">Email</label><input id="pwa-email" type="email"><label for="pwa-password">Пароль</label><input id="pwa-password" type="password" autocomplete="off">';document.body.append(form);});
 current='a';await page.goto(base+'/register?role=parent');await page.evaluate(()=>navigator.serviceWorker.ready);await fields();await page.locator('#pwa-email').fill('form@example.com');await page.locator('#pwa-password').fill('VerySecret123');
 await page.evaluate(()=>{const input=document.createElement('input');input.type='file';input.id='update-test-file';document.body.append(input);});await page.locator('#update-test-file').setInputFiles({name:'receipt.txt',mimeType:'text/plain',buffer:Buffer.from('selected file')});
 current='b';await page.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration())?.update();window.dispatchEvent(new Event('focus'));});await expect(page.getByText('Доступна новая версия',{exact:true})).toBeVisible({timeout:30000});await page.locator('.pwa-update button').click();await expect(page.locator('.pwa-update')).toContainText('Сначала отправьте или отмените выбранные файлы.');await expect(page.locator('meta[name=app-version]')).toHaveAttribute('content','pwa-test-a');
 expect(await page.evaluate(()=>JSON.stringify({...sessionStorage}))).not.toContain('VerySecret123');await page.locator('#update-test-file').setInputFiles([]);await page.locator('.pwa-update button').click();await expect(page.locator('.pwa-update')).toContainText('Завершите вход перед обновлением.');await page.locator('#pwa-password').clear();await page.locator('.pwa-update button').click();await expect(page.locator('meta[name=app-version]')).toHaveAttribute('content','pwa-test-b');await fields();await expect(page.locator('#pwa-email')).toHaveValue('form@example.com');
});
test('an installed PWA updates once, preserves a controlled draft and works offline',async({page,context})=>{
 test.setTimeout(100000);current='a';await page.goto(base+'/auth?next=/profile');await page.getByRole('button',{name:/Родитель.*parent@birge.example/}).click();await expect(page.locator('.account-form')).toBeVisible();await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.locator('.account-form input').first().fill('Черновик родителя');await page.evaluate(async()=>{await caches.open('birge-bol-precache-obsolete');localStorage.setItem('keep-user-data','preserved');await caches.open('unrelated-user-data');});
 current='b';await page.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration())?.update();window.dispatchEvent(new Event('focus'));});await expect(page.getByText('Доступна новая версия',{exact:true})).toBeVisible({timeout:30000});
 await page.waitForTimeout(9000);await expect(page.locator('meta[name=app-version]')).toHaveAttribute('content','pwa-test-a');await page.locator('.pwa-update').getByRole('button',{name:'Обновить',exact:true}).click();
 await expect(page.locator('meta[name=app-version]')).toHaveAttribute('content','pwa-test-b',{timeout:30000});await expect(page.locator('.account-form input').first()).toHaveValue('Черновик родителя');
 await page.getByRole('button',{name:'ҚАЗ',exact:true}).click();await expect(page.locator('.account-form input').first()).toHaveValue('Черновик родителя');
 expect(await page.evaluate(()=>localStorage.getItem('keep-user-data'))).toBe('preserved');const keys=await page.evaluate(()=>caches.keys());expect(keys).not.toContain('birge-bol-precache-obsolete');expect(keys).toContain('unrelated-user-data');
 await context.setOffline(true);await page.reload();await expect(page.locator('.account-form input').first()).toHaveValue('Черновик родителя');await page.goto(base+'/app');await expect(page.locator('.dashboard-hero')).toBeVisible();await context.setOffline(false);
});
test('a removed lazy chunk reloads once and does not erase the previous form draft',async({browser})=>{
 current='a';const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();try{
  await page.goto(base+'/auth?next=/profile');await page.getByRole('button',{name:/Родитель.*parent@birge.example/}).click();await expect(page.locator('.account-form')).toBeVisible();await page.locator('.account-form input').first().fill('До обновления');
  current='b';await page.locator('a[href="/support"]').first().click();await expect(page.locator('meta[name=app-version]')).toHaveAttribute('content','pwa-test-b');await expect(page.getByRole('heading',{name:'Безопасность и поддержка'})).toBeVisible();
  expect(await page.evaluate(()=>sessionStorage.getItem('bb-preload-recovery:pwa-test-a'))).toBe('1');await page.goto(base+'/profile');await expect(page.locator('.account-form input').first()).toHaveValue('До обновления');
  await page.evaluate(()=>sessionStorage.setItem('bb-preload-recovery:pwa-test-b','1'));const navigations:string[]=[];page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations.push(frame.url());});await page.evaluate(()=>window.dispatchEvent(new Event('vite:preloadError')));await page.waitForTimeout(500);expect(navigations).toHaveLength(0);
 }finally{await context.close();}
});
