import type {Page} from '@playwright/test';
export async function parentLogin(page:Page,next='/app'){await page.goto('/auth?next='+encodeURIComponent(next));const cookies=page.getByRole('button',{name:'Только необходимые',exact:true});if(await cookies.isVisible())await cookies.click();await page.getByRole('button',{name:/Родитель.*parent@birge.example/}).click();await page.waitForURL('**'+next);}
