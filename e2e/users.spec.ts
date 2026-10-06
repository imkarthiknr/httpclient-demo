import { expect, test } from '@playwright/test';

test.describe('user directory', () => {
  test('lists, paginates and searches with state in the URL', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/users$/);
    await expect(page.locator('.users li')).toHaveCount(5);
    await expect(page.getByText('Page 1 of 3')).toBeVisible();

    await page.getByRole('button', { name: 'Next →' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText('Page 2 of 3')).toBeVisible();

    await page.getByPlaceholder('Search name or email…').fill('okafor');
    await expect(page).toHaveURL(/\?q=okafor$/);
    await expect(page.locator('.users li')).toHaveCount(1);
    await expect(page.locator('.users li')).toContainText('Amara Okafor');

    // A shared link restores the same view.
    await page.goto('/users?q=okafor');
    await expect(page.getByPlaceholder('Search name or email…')).toHaveValue('okafor');
    await expect(page.locator('.users li')).toHaveCount(1);
  });

  test('shows a friendly message for an unknown user', async ({ page }) => {
    await page.goto('/users/999');
    await expect(page.getByRole('alert')).toContainText('Not found');
  });
});

test.describe('posts CRUD', () => {
  test('creates, edits and deletes a post, persisted by the API', async ({ page }) => {
    await page.goto('/users/2');
    await expect(page.getByRole('heading', { name: 'Lukas Becker' })).toBeVisible();

    await page.getByLabel('Title').fill('E2E post');
    await page.getByLabel('Body').fill('Written by Playwright.');
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.locator('.post').first()).toContainText('E2E post');

    await page.getByRole('button', { name: 'Edit E2E post' }).click();
    await page.getByLabel('Post title').fill('E2E post (edited)');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('.post').first()).toContainText('E2E post (edited)');

    await page.reload();
    await expect(page.locator('.post').first()).toContainText('E2E post (edited)');

    await page.getByRole('button', { name: 'Delete E2E post (edited)' }).click();
    await expect(page.getByText('E2E post (edited)')).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Lukas Becker' })).toBeVisible();
    await expect(page.getByText('E2E post (edited)')).toHaveCount(0);
  });

  test('every request shows up in the HTTP log', async ({ page }) => {
    await page.goto('/users/3');
    const log = page.locator('app-http-log li');
    await expect(log.first()).toContainText('GET');
    await expect(log.first()).toContainText('/users/3?_embed=posts');
    await expect(log.first()).toContainText('200');
  });
});

test.describe('flaky network simulation', () => {
  test('retries GETs twice, then surfaces the error', async ({ page }) => {
    // Make every chaos roll fail so the outcome is deterministic.
    await page.addInitScript(() => (Math.random = () => 0));
    await page.goto('/users');
    await expect(page.locator('.users li')).toHaveCount(5);

    await page.getByLabel('Simulate flaky network').check();
    await page.getByRole('button', { name: 'Next →' }).click();

    await expect(page.getByRole('alert')).toContainText('503');
    const failures = page.locator('app-http-log li.fail');
    await expect(failures).toHaveCount(3); // 1 attempt + 2 retries

    await page.getByLabel('Simulate flaky network').uncheck();
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByText('Page 2 of 3')).toBeVisible();
  });
});
