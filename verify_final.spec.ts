import { test, expect } from '@playwright/test';

test('verify homepage and details', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await expect(page.locator('h1')).toContainText('What Do You Wish Existed?');
  await page.screenshot({ path: 'final_homepage.png', fullPage: true });

  // Navigate to trends
  await page.click('text=Trends');
  await expect(page.locator('h1')).toContainText('Builder Inspiration');
  await page.screenshot({ path: 'final_trends.png', fullPage: true });
});
