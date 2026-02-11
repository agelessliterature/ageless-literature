/**
 * E2E Test: Authentication Flows
 * Tests login, registration, and session management
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  const testUser = {
    email: 'buyer@test.com',
    password: 'Test123!@#',
  };

  const newUser = {
    email: `newuser-${Date.now()}@test.com`,
    password: 'NewUser123!@#',
    firstName: 'New',
    lastName: 'User',
  };

  test('user can login with valid credentials', async ({ page }) => {
    await page.goto('/auth/login');

    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Should redirect to account page
    await expect(page).toHaveURL('/account');
    await expect(page.locator('h1')).toContainText(/my account|account/i);
  });

  test('user cannot login with invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');

    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', 'WrongPassword123');
    await page.click('button[type="submit"]');

    // Should stay on login page and show error
    await expect(page).toHaveURL('/auth/login');
    await expect(page.locator('text=/invalid|incorrect|failed/i')).toBeVisible();
  });

  test('user can register new account', async ({ page }) => {
    await page.goto('/auth/register');

    await page.fill('input[name="email"]', newUser.email);
    await page.fill('input[name="password"]', newUser.password);
    await page.fill('input[name="confirmPassword"]', newUser.password);
    await page.fill('input[name="firstName"]', newUser.firstName);
    await page.fill('input[name="lastName"]', newUser.lastName);

    await page.click('button[type="submit"]');

    // Should redirect to account page after registration
    await expect(page).toHaveURL('/account', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText(/my account|account/i);
  });

  test('authenticated user can logout', async ({ page }) => {
    // Login first
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/account');

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=/logout|sign out/i');

    // Should redirect to login or home
    await expect(page).toHaveURL(/\/(auth\/login|$)/);
  });

  test('unauthenticated user redirected to login for protected pages', async ({ page }) => {
    await page.goto('/account');

    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('session persists across page refreshes', async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/account');

    // Refresh page
    await page.reload();

    // Should still be logged in
    await expect(page).toHaveURL('/account');
    await expect(page.locator('h1')).toContainText(/my account|account/i);
  });

  test('password visibility toggle works', async ({ page }) => {
    await page.goto('/auth/login');

    const passwordInput = page.locator('input[name="password"]');
    const toggleButton = page.locator('button[aria-label*="password"]');

    // Initially should be password type
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click again to hide
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('form validation shows errors', async ({ page }) => {
    await page.goto('/auth/login');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('text=/email is required|required/i')).toBeVisible();
  });
});
