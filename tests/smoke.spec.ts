import { test, expect } from '@playwright/test';

test.describe('Elastic upgrade dashboard', () => {
  test('renders hero, stat cards and tables', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /Observe live clusters/i })
    ).toBeVisible();

    const statCards = page.getByText(/Cluster status|Active shards|Index health/);
    await expect(statCards.first()).toBeVisible();

    await expect(page.getByText('Allocation & Disk')).toBeVisible();
    await expect(page.getByText('Recovery flow')).toBeVisible();
    await expect(page.getByText('Node matrix')).toBeVisible();
  });
});

