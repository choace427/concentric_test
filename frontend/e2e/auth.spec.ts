import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
  });

  test('should show error for empty form submission', async ({ page }) => {
    await page.getByRole('button', { name: /login/i }).click();
    
    await expect(page.getByText(/please fill in all fields/i).first()).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /login/i }).click();

    await expect(page.getByText(/invalid credentials/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('should have Google OAuth button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/admin');
    
    await expect(page).toHaveURL(/.*\/$/);
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });
});

