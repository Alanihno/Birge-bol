import {test,expect} from '@playwright/test';
import {parentLogin} from './auth-helper';
test('keeps the browser install invitation across navigation',async({page})=>{
 await parentLogin(page,'/find');await page.locator('main h1').first().waitFor();
 await page.evaluate(()=>{const event=new Event('beforeinstallprompt',{cancelable:true}) as Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};event.prompt=async()=>{document.documentElement.dataset.installPromptCalled='yes';};event.userChoice=Promise.resolve({outcome:'dismissed'});window.dispatchEvent(event);});
 await page.getByRole('link',{name:'Настройки',exact:true}).click();
 await page.getByRole('button',{name:'Установить Birge Bol',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('data-install-prompt-called','yes');
 await expect(page.getByText('Отсутствие кнопки само по себе',{exact:false})).toBeVisible();
});

