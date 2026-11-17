const { chromium, expect }=require('@playwright/test');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const base=process.env.QA_BASE_URL||'http://127.0.0.1:4195';
 const errors=[];const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/auth?next=/diary');await page.locator('.auth-demo summary').click();
  await page.getByRole('button',{name:/Родитель.*parent@birge.example/}).click();await page.waitForURL(url=>url.pathname==='/diary',{timeout:45000});
  await expect(page.getByRole('region',{name:'Оплата записей'})).toContainText('Чек отправлен · ждём специалиста',{timeout:25000});
  await expect(page.getByRole('heading',{name:'Отчёт за неделю'})).toBeVisible();
  const dates=await page.locator('.care-appointment .hd h2').allTextContents();
  fs.mkdirSync('.preview/prepared',{recursive:true});await page.screenshot({path:'.preview/prepared/diary.png',fullPage:true});
  await page.setViewportSize({width:360,height:800});await page.screenshot({path:'.preview/prepared/diary-mobile.png',fullPage:true});
  if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error('Mobile overflow');
  await page.goto(base+'/find');await expect(page.locator('.specialist-card').first()).toBeVisible();
  const card=await page.locator('.specialist-card').first().innerText();if(!/4\s*отзыв/.test(card))throw Error('Prepared reviews not shown: '+card);
  await page.goto(base+'/moms?topic='+encodeURIComponent('Новости'));await expect(page.locator('.question-card')).toHaveCount(4);
  console.log(JSON.stringify({connected:true,dates,news:4,reviewsPerSpecialist:4,errors}));
  if(errors.length)throw Error(errors.join('\n'));
 }catch(error){
  fs.mkdirSync('.preview/prepared',{recursive:true});await page.screenshot({path:'.preview/prepared/connected-failure.png',fullPage:true});
  console.error(JSON.stringify({url:page.url(),main:await page.locator('main').innerText().catch(()=>''),errors}));throw error;
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
