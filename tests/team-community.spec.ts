import {test,expect} from '@playwright/test';
import {parentLogin} from './auth-helper';
test('a parent grants and revokes access to the common plan',async({page})=>{
 await parentLogin(page,'/child/team');await expect(page.getByRole('heading',{name:'Команда ребёнка',exact:true})).toBeVisible();
 await page.getByRole('combobox').selectOption('00000000-0000-4000-8000-000000000001');await page.getByRole('button',{name:'Разрешить общий доступ',exact:true}).click();await expect(page.getByRole('button',{name:'Отозвать доступ',exact:true})).toBeVisible();await page.reload();await page.getByRole('button',{name:'Отозвать доступ',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Отозвать доступ',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();await expect(page.getByRole('button',{name:'Отозвать доступ',exact:true})).toHaveCount(0);
});
test('community interests persist and nested replies survive reload',async({page})=>{
 await parentLogin(page,'/moms');await page.getByText('Мои интересы и уведомления',{exact:true}).click();await page.getByRole('button',{name:'Поведение +',exact:true}).click();await page.getByRole('checkbox',{name:'Уведомлять о новых ветках по моим темам'}).check();await page.reload();await page.getByText('Мои интересы и уведомления',{exact:true}).click();await expect(page.getByRole('checkbox',{name:'Уведомлять о новых ветках по моим темам'})).toBeChecked();await expect(page.locator('.question-card').first()).toContainText('Поведение');
 await page.locator('.question-card').first().click();await page.getByLabel('Ваш ответ',{exact:true}).fill('Спасибо, эта тема важна для нашей семьи.');await page.getByRole('button',{name:'Отправить ответ',exact:true}).click();await expect(page.getByText('Спасибо, эта тема важна для нашей семьи.',{exact:true})).toBeVisible();await page.reload();await expect(page.getByText('Спасибо, эта тема важна для нашей семьи.',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Ваш ответ',{exact:true})).toHaveValue('');
 await page.setViewportSize({width:360,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
