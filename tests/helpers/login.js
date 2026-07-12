/**
 * Login helper function
 * Reusable login skill for all test scenarios
 */
async function login(page, email, password) {
  await page.goto('https://accounts.wallex.plus/');

  // Fill email/username and password using visible form labels
  await page.getByRole('textbox', { name: 'User name' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);

  // Click continue / login button and wait for navigation
  await Promise.all([
    page.waitForNavigation(),
    page.getByRole('button', { name: 'Continue' }).click(),
  ]);
}

module.exports = { login };
