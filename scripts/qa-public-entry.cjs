const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    fs.mkdirSync('.preview/public-entry', { recursive: true });
    await page.goto('http://127.0.0.1:4174/');
    await page.getByRole('heading', { name: /Вам не нужно/ }).waitFor();
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.screenshot({ path: '.preview/public-entry/landing-mobile.png', fullPage: true });
    await page.goto('http://127.0.0.1:4174/auth/update.html');
    await page.waitForURL('**/?version=*');
    await page.getByRole('heading', { name: /Вам не нужно/ }).waitFor();
    await page.goto('http://127.0.0.1:4174/register?role=parent');
    await page.getByRole('button', { name: 'Создать аккаунт', exact: true }).waitFor();
    await page.screenshot({ path: '.preview/public-entry/register-mobile.png', fullPage: true });
    const result = { cacheRefreshOpensLanding: true, registrationVisible: true, dashboardElements: await page.locator('.app-shell, .sidebar, .bottom-tabs').count(), overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), errors };
    console.log(JSON.stringify(result));
    if (result.dashboardElements || result.overflow || errors.length) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
