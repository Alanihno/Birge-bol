import {test,expect} from '@playwright/test';
import {parentLogin} from './auth-helper';

test('calendar previews three nearest visits and a payment link reveals a later visit',async({page})=>{
 await parentLogin(page,'/app');await expect(page.locator('.calendar-panel')).toBeVisible();
 await page.evaluate(()=>{
  const d=JSON.parse(localStorage.getItem('bb-care-v3')!);
  const base={parent_id:'20000000-0000-4000-8000-000000000001',child_id:'10000000-0000-4000-8000-000000000001',specialist_id:d.specialists[0].id,service:'Консультация',visit_verified:false,is_demo:true,share_diary:false};
  d.appointments=Array.from({length:7},(_,i)=>{const day=i+1,date=new Date(Date.now()+day*86400000);date.setHours(14,0,0,0);return {...base,id:'compact-'+day,slot_id:'slot-'+day,starts_at:date.toISOString(),ends_at:new Date(+date+45*60000).toISOString(),status:day===7?'pending':'confirmed',payment_state:day===7?'payment_reported':'confirmed',payment_claimed_at:new Date().toISOString(),payment_amount:8000,reason:'Контрольная запись '+day};}).reverse();
  localStorage.setItem('bb-care-v3',JSON.stringify(d));window.dispatchEvent(new Event('bb-care-change'));
 });
 const calendar=page.locator('.calendar-panel'),previews=calendar.locator('.appointment-preview:visible');
 await expect(previews).toHaveCount(3);await expect(previews.first()).toHaveAttribute('href','/diary?appointment=compact-1');
 await calendar.getByRole('button',{name:'Показать ещё 3',exact:true}).click();await expect(previews).toHaveCount(6);
 await calendar.getByRole('button',{name:'Показать ещё 1',exact:true}).click();await expect(previews).toHaveCount(7);
 await calendar.getByRole('button',{name:'Свернуть',exact:true}).click();await expect(previews).toHaveCount(3);
 await page.setViewportSize({width:360,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:'.preview/compact-calendar-mobile.png',fullPage:true});
 await page.goto('/diary');await expect(page.locator('.care-appointment:visible')).toHaveCount(3);
 const inbox=page.getByRole('region',{name:'Оплата записей'});await inbox.getByRole('link',{name:/К оплате/}).click();
 const last=page.locator('#appointment-compact-7');await expect(last).toBeVisible();await expect(last).toBeFocused();await expect(last).toContainText('Оплата заявлена');
 const list=last.locator('xpath=ancestor::div[contains(@class,"expandable-list")][1]');await list.getByRole('button',{name:'Свернуть',exact:true}).click();await expect(last).toBeHidden();
 await inbox.getByRole('link',{name:/К оплате/}).click();await expect(last).toBeVisible();
});

test('reviews expand without changing totals and Kazakh controls fit a phone',async({page})=>{
 await parentLogin(page,'/find');await expect(page.locator('.specialist-card').first()).toBeVisible();
 await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('bb-care-v3')!);d.reviews=Array.from({length:8},(_,i)=>({id:'compact-review-'+i,appointment_id:'visit-'+i,parent_id:'family-'+i,specialist_id:d.specialists[0].id,body:'Уникальное наблюдение семьи '+i,contact:5,strengths:[],status:'verified',is_demo:true,visit_verified:true,created_at:new Date(Date.now()-i*86400000).toISOString(),case_summary:'Мальчик, 3 года · речь: пока не использует слова · очно'}));localStorage.setItem('bb-care-v3',JSON.stringify(d));});
 await page.reload();const card=page.locator('.specialist-card').filter({has:page.locator('a.person-name',{hasText:'Айгерим С.'})});await expect(card.locator('.rating-line')).toContainText('(8)');await card.locator('a.person-name').click();
 const reviews=page.locator('section').filter({has:page.locator('.sample-review')});
 await expect(reviews.locator('.sample-review:visible')).toHaveCount(3);await expect(reviews.locator('.sample-review:visible').first()).toContainText('наблюдение семьи 0');
 await reviews.getByRole('button',{name:'Показать ещё 3',exact:true}).click();await expect(reviews.locator('.sample-review:visible')).toHaveCount(6);await reviews.getByRole('button',{name:'Свернуть',exact:true}).click();await expect(reviews.locator('.sample-review:visible')).toHaveCount(3);
 await page.getByRole('button',{name:'ҚАЗ',exact:true}).click();await expect(reviews.getByRole('button',{name:'Тағы 3 көрсету'})).toBeVisible();await page.setViewportSize({width:360,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await reviews.screenshot({path:'.preview/compact-reviews-mobile.png'});
});

test('collapsing an appointment keeps an entered visit code',async({page})=>{
 await parentLogin(page,'/diary');await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('bb-care-v3')!);d.appointments=Array.from({length:5},(_,i)=>({id:'code-'+i,parent_id:'20000000-0000-4000-8000-000000000001',child_id:'10000000-0000-4000-8000-000000000001',specialist_id:d.specialists[0].id,slot_id:'code-slot-'+i,service:'Приём',status:'attended',visit_verified:false,is_demo:true,starts_at:new Date(Date.now()+(i+1)*86400000).toISOString(),ends_at:new Date(Date.now()+(i+1)*86400000+3600000).toISOString()}));localStorage.setItem('bb-care-v3',JSON.stringify(d));});await page.reload();
 await page.getByRole('button',{name:'Показать ещё 2',exact:true}).click();const input=page.locator('#appointment-code-4').getByLabel('Код посещения');await input.fill('123456');await page.getByRole('button',{name:'Свернуть',exact:true}).click();await expect(input).toBeHidden();await page.getByRole('button',{name:'Показать ещё 2',exact:true}).click();await expect(input).toHaveValue('123456');
});
