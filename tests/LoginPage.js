const { test, expect } = require('@playwright/test');
const { login } = require('./helpers/login');

test('login test', async ({ page }) => {
  await login(page, 'huishan.chin@wallextech.com', 'Test123$');
  await page.getByTestId('account-card-Company Hui Shan').click();
});

