import { test, expect } from '@playwright/test';

test.skip(process.env.CONNECTED_AUTH_TESTS !== '1', 'Run against the connected production build.');
test.beforeEach(async({page})=>{await page.route('https://api.pwnedpasswords.com/range/*',route=>route.fulfill({contentType:'text/plain',body:'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:0\r\n'}));});

test('landing leads to registration and login without a dashboard or a legacy demo session', async ({ page }) => {
    await page.addInitScript(() => {
        sessionStorage.setItem('bb-mode', 'demo');
        localStorage.setItem('bb-demo-session', 'yes');
        sessionStorage.setItem('bb-demo-identity', JSON.stringify({ id: '20000000-0000-4000-8000-000000000002', role: 'specialist', email: 'specialist@birge.example' }));
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Вам не нужно/ })).toBeVisible();
    await expect(page.locator('.app-shell')).toHaveCount(0);
    await page.getByRole('link', { name: /Начать бесплатно/ }).first().click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.locator('.sidebar, .bottom-tabs, .app-shell')).toHaveCount(0);
    await page.getByRole('button', { name: /Я родитель/ }).click();
    await expect(page.getByRole('button', { name: 'Создать аккаунт', exact: true })).toBeVisible();
    await expect(page.getByLabel('Логин', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: '← О проекте' }).click();
    await page.getByRole('link', { name: 'Войти', exact: true }).click();
    await expect(page).toHaveURL(/\/auth$/);
    await page.getByRole('button', { name: /Я родитель/ }).click();
    await expect(page.getByRole('button', { name: 'Войти', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Создать аккаунт', exact: true })).toHaveCount(0);
});

test('registration requires consent, submits signup and shows email confirmation before a cabinet', async ({ page }) => {
    let submitted: Record<string, unknown> | null = null;
    await page.route('https://*.supabase.co/auth/v1/signup**', async route => {
        submitted = route.request().postDataJSON();
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: '20000000-0000-4000-8000-000000000009', email: 'signup-test@example.com', identities: [], aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() }, session: null }) });
    });
    await page.goto('/register?role=parent&method=email');
    await page.getByLabel('Email', { exact: true }).fill('signup-test@example.com');
    await page.getByLabel('Пароль', { exact: true }).fill('TestPassword!2026');
    const submit = page.getByRole('button', { name: 'Создать аккаунт', exact: true });
    await expect(submit).toBeDisabled();
    await page.getByRole('checkbox').check();
    await submit.click();
    await expect(page.getByRole('heading',{name:'Подтвердите электронную почту',exact:true})).toBeVisible();
    expect(submitted).toMatchObject({ email: 'signup-test@example.com', password: 'TestPassword!2026' });
    expect(await page.evaluate(() => sessionStorage.getItem('bb-auth-next'))).toBe('/onboarding');
    await expect(page).toHaveURL(/\/auth\/confirm$/);
    await expect(page.locator('.app-shell')).toHaveCount(0);
});

test('specialist registration and protected deep links stay in the public entry flow', async ({ page }) => {
    await page.goto('/register?role=specialist');
    await expect(page.getByText(/После регистрации специалист проходит модерацию/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Создать аккаунт', exact: true })).toBeVisible();
    await page.goto('/pro');
    await expect(page).toHaveURL(/\/auth\?next=%2Fpro$/);
    await expect(page.locator('.sidebar, .bottom-tabs, .app-shell')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Давайте познакомимся' })).toBeVisible();
    await page.setViewportSize({ width: 320, height: 760 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
