import { test, expect } from '@playwright/test';
import { parentLogin } from './auth-helper';

test('diary sorts nearest visits first and preserves reported payments', async ({page}) => {
 await parentLogin(page, '/diary');
 await expect(page.getByRole('heading',{name:'Приёмы и домашняя практика'})).toBeVisible();
 await page.evaluate(() => {
  const state=JSON.parse(localStorage.getItem('bb-care-v3')!);
  const base={parent_id:'20000000-0000-4000-8000-000000000001',child_id:'10000000-0000-4000-8000-000000000001',specialist_id:'00000000-0000-4000-8000-000000000001',service:'Демонстрационная консультация',visit_verified:false,is_demo:true};
  const when=(days:number)=>new Date(Date.now()+days*86400000).toISOString();
  state.appointments=[{...base,id:'later',starts_at:when(3),ends_at:when(3),status:'confirmed'},{...base,id:'near',starts_at:when(1),ends_at:when(1),status:'pending',payment_state:'payment_reported',payment_claimed_at:when(-1),payment_deadline:when(-1)}];
  localStorage.setItem('bb-care-v3',JSON.stringify(state));window.dispatchEvent(new Event('bb-care-change'));
 });
 await expect(page.locator('.care-appointment').first()).toHaveAttribute('id','appointment-near');
 const inbox=page.getByRole('region',{name:'Оплата записей'});
 await expect(inbox).toContainText('Чек отправлен · ждём специалиста');
 await expect(inbox).toContainText('бронь сохраняется до проверки оплаты');
 await inbox.getByRole('link',{name:/К оплате/}).click();
 await expect(page).toHaveURL(/appointment=near/);
 await expect(page.locator('#appointment-near')).toBeFocused();
 await page.reload();
 await expect(inbox).toContainText('Чек отправлен · ждём специалиста');
});

test('product news and community branches have readable discussions', async ({page}) => {
 await parentLogin(page,'/app');
 await expect(page.getByRole('heading',{name:'Новости Birge Bol'})).toBeVisible();
 await page.getByRole('link',{name:'Все новости →'}).click();
 await expect(page.locator('.question-card').first()).toBeVisible();await expect(page).toHaveURL(/topic=/);
 await page.locator('.question-card').filter({has:page.getByRole('heading',{name:'Новости: оплата и статус бронирования',exact:true})}).click();
 await expect(page.getByText('Демо-пример: после отправки чека бронь сохраняется до проверки специалистом. Повторно оплачивать из-за ожидания подтверждения не нужно.')).toBeVisible();
 await page.goto('/moms?topic=Поддержка');
 await expect(page.locator('.question-card').first()).toBeVisible();await expect(page.getByRole('button',{name:'Поддержка',exact:true})).toHaveClass(/selected/);
 await page.setViewportSize({width:360,height:800});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
