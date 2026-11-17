import {test,expect} from '@playwright/test';
import {parentLogin} from './auth-helper';
test('support saves a request and Kazakh tabs are translated',async({page})=>{
 await parentLogin(page,'/support');await expect(page.getByRole('heading',{name:'Безопасность и поддержка'})).toBeVisible();
 await page.getByLabel('Кратко о вопросе').fill('Проверка статуса оплаты');await page.getByLabel('Что произошло').fill('Подскажите, пожалуйста, когда будет проверен отправленный чек.');await page.getByRole('button',{name:'Отправить обращение',exact:true}).click();await page.getByRole('button',{name:'Открыть мои обращения →'}).click();await expect(page.getByRole('heading',{name:'Проверка статуса оплаты'})).toBeVisible();
 await page.evaluate(()=>localStorage.setItem('bb-lang','kk'));await page.reload();await expect(page.getByRole('heading',{name:'Қауіпсіздік және қолдау'})).toBeVisible();await page.getByRole('button',{name:'Қауіпсіздік',exact:true}).click();await expect(page.locator('main')).not.toContainText('Как защищён доступ');
});
test('PINGO replaces generated articles in both languages',async({page})=>{
 await parentLogin(page,'/app');const card=page.getByRole('button',{name:/PINGO/});await card.click();const dialog=page.getByRole('dialog');await expect(dialog).toContainText('Цифровые сертификаты');await expect(dialog.locator('a[href="https://pingo-kids.web.app/"]')).toBeVisible();await page.getByRole('button',{name:'Закрыть',exact:true}).click();
 await page.evaluate(()=>localStorage.setItem('bb-lang','kk'));await page.reload();await page.getByRole('button',{name:/PINGO/}).click();await expect(page.getByRole('dialog')).toContainText('Цифрлық сертификаттар');
});
test('parent interface contains no prototype labels',async({page})=>{
 await parentLogin(page,'/diary');await expect(page.locator('main')).not.toContainText(/демо|вымышлен|учебн|презентацион/iu);await page.setViewportSize({width:360,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
