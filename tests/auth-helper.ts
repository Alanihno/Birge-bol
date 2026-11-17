import type {Page} from '@playwright/test';
export async function parentLogin(page:Page,next='/app'){await page.goto('/auth?next='+encodeURIComponent(next));await page.getByRole('button',{name:/Родитель.*parent@birge.example/}).click();await page.waitForURL('**'+next);}
