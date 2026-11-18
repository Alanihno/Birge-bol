import {test,expect} from '@playwright/test';
import {parentLogin} from './auth-helper';
test('new pediatric and family care roles are searchable and explicitly marked',async({page})=>{
 await parentLogin(page,'/find');await page.getByRole('combobox',{name:'Направление',exact:true}).selectOption('Детский невролог');await expect(page.locator('.specialist-card')).toHaveCount(1);await expect(page.locator('.specialist-card .demo-specialist')).toHaveText('Вымышленный специалист · демо');
 await page.getByRole('combobox',{name:'Направление',exact:true}).selectOption('Няня с опытом сопровождения');await expect(page.locator('.specialist-card')).toHaveCount(1);await page.locator('.specialist-card a.person-name').click();await expect(page.locator('main')).toContainText('Не оказывает медицинские услуги');
});
test('review totals use the current rating result and case context is visible',async({page})=>{
 await parentLogin(page,'/find');await expect(page.locator('.specialist-card').first()).toBeVisible();
 await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('bb-care-v3')!);d.specialists[0].verified_count=0;d.specialists[0].experience=4;d.reviews=Array.from({length:4},(_,i)=>({id:'p4-review-'+i,appointment_id:'p4-visit-'+i,parent_id:'family-'+i,specialist_id:d.specialists[0].id,body:'Отдельный текст отзыва '+i,contact:5,strengths:[],status:'verified',is_demo:true,visit_verified:true,case_summary:'Мальчик, 3 года · речь: пока не использует слова · очно',created_at:new Date().toISOString()}));localStorage.setItem('bb-care-v3',JSON.stringify(d));});
 await page.reload();const card=page.locator('.specialist-card').filter({has:page.locator('a.person-name',{hasText:'Айгерим С.'})});await expect(card).toContainText('Стаж: 4 года');await expect(card.locator('.rating-line')).toContainText('(4)');
 await card.locator('a.person-name').click();await expect(page.locator('.case-context').first()).toContainText('Мальчик, 3 года');await expect(page.getByText('тестовый отзыв',{exact:false}).first()).toBeVisible();
});
