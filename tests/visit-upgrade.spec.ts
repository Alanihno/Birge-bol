import { test,expect } from '@playwright/test';
import { parentLogin } from './auth-helper';
test('near slots lead the catalogue; later and unavailable specialists remain distinguishable',async({page})=>{
 await parentLogin(page,'/find');
 await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('bb-care-v3')!);for(const slot of d.slots)if(slot.specialist_id==='00000000-0000-4000-8000-000000000002'){slot.starts_at=new Date(Date.parse(slot.starts_at)+9*86400000).toISOString();slot.ends_at=new Date(Date.parse(slot.ends_at)+9*86400000).toISOString();}localStorage.setItem('bb-care-v3',JSON.stringify(d));window.dispatchEvent(new Event('bb-care-change'));});
 await expect(page.locator('.specialist-card').first().locator('.availability-badge')).toContainText('Есть окна');
 await page.getByRole('button',{name:/Показать ещё/}).click();
 await expect(page.locator('.availability-badge.later')).toHaveCount(1);
 expect(await page.locator('.specialist-unavailable').count()).toBeGreaterThan(0);
 await page.getByRole('checkbox',{name:'Только со свободным временем на 7 дней'}).click();
 await expect(page.getByRole('checkbox',{name:'Только со свободным временем на 7 дней'})).toBeChecked();
 await expect(page.locator('.specialist-unavailable')).toHaveCount(0);await expect(page.locator('.availability-badge.later')).toHaveCount(0);
});
test('the keyword guide and database-style web map lead to role-appropriate tabs; payment demo shows both paths',async({page})=>{
 await parentLogin(page,'/data-map');await expect(page.getByRole('heading',{name:'Карта связей Birge Bol'})).toBeVisible();
 await page.locator('.data-web').getByRole('button',{name:'Оплата и чеки',exact:true}).click();await expect(page.locator('.data-map-layout aside')).toContainText('private.booking_payments');
 await page.getByRole('button',{name:'Помощник по разделам',exact:true}).click();await page.getByLabel('Что хотите сделать?',{exact:true}).fill('как оплатить');await page.getByRole('dialog').getByRole('link',{name:'Оплата и чеки →',exact:true}).click();await expect(page).toHaveURL(/\/payments$/);await page.goto('/diary');
 await page.getByRole('button',{name:'Как работает бронь · два примера',exact:true}).click();await page.getByRole('button',{name:/Я оплатила \+ чек/,exact:false}).click();await expect(page.getByRole('dialog')).toContainText('таймер заморожен');await page.getByRole('button',{name:/Специалист: оплата получена/,exact:false}).click();await expect(page.getByRole('dialog')).toContainText('Подтверждено');await page.getByRole('button',{name:'Запустить таймер',exact:true}).click();await page.getByRole('button',{name:'Показать истечение срока',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Слот снова свободен');await page.getByRole('button',{name:'Закрыть',exact:true}).click();
 await page.setViewportSize({width:320,height:760});await page.goto('/data-map');await expect(page.locator('.data-web')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('printed provider QR stays stable; paid visit is verified only within its time window and only once',async({page,context})=>{test.setTimeout(90000);
 await parentLogin(page,'/specialists/00000000-0000-4000-8000-000000000001');await page.getByRole('button',{name:'Записаться',exact:true}).click();await expect(page).toHaveURL(/\/diary$/);
 await page.locator('.payment-box input[type=file]').setInputFiles({name:'receipt.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 synthetic')});await page.getByRole('button',{name:'Я оплатила',exact:true}).click();
 const pro=await context.newPage();await pro.goto('/auth');await pro.getByRole('button',{name:/Специалист.*specialist@/}).click();await pro.waitForURL('**/pro');await pro.goto('/pro/requests');await pro.getByRole('button',{name:'Оплата получена',exact:true}).click();await pro.getByRole('checkbox',{name:/Я проверил/}).check();await pro.getByRole('button',{name:'Подтвердить оплату и запись',exact:true}).click();
 await pro.getByRole('button',{name:'Мой QR для посещений',exact:true}).click();const qr=await pro.getByLabel('Ссылка из QR',{exact:true}).inputValue();await expect(pro.getByRole('img',{name:'Постоянный QR для подтверждения посещения'})).toBeVisible();await pro.getByRole('button',{name:'Закрыть',exact:true}).click();await pro.getByRole('button',{name:'Мой QR для посещений',exact:true}).click();await expect(pro.getByLabel('Ссылка из QR',{exact:true})).toHaveValue(qr);await pro.getByRole('button',{name:'Закрыть',exact:true}).click();
 await page.goto(qr);await page.getByRole('button',{name:'Подтвердить посещение',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Нет подтверждённой записи в допустимое время');
 const starts=await page.evaluate(()=>JSON.parse(localStorage.getItem('bb-care-v3')!).appointments[0].starts_at);await page.clock.setFixedTime(new Date(starts));await page.getByRole('button',{name:'Подтвердить посещение',exact:true}).click();await expect(page.getByRole('heading',{name:'Посещение подтверждено',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Оставить отзыв',exact:true})).toBeVisible();await page.goto(qr);await page.getByRole('button',{name:'Подтвердить посещение',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Нет подтверждённой записи');
});
