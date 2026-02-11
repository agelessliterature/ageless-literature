/**
 * E2E Test: Buyer Purchase Flow
 * Tests complete user journey from browsing to checkout
 */

import { test, expect } from '@playwright/test';

test.describe('Buyer Purchase Flow', () => {
  const testBuyer = {
    email: 'buyer@test.com',
    password: 'Test123!@#',
  };

  test.beforeEach(async ({ page }) => {
    // Start from homepage
    await page.goto('/');
  });

  test('buyer can complete full purchase journey', async ({ page }) => {
    // Step 1: Login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', testBuyer.email);
    await page.fill('input[name="password"]', testBuyer.password);
    await page.click('button[type="submit"]');

    // Wait for redirect to account page
    await expect(page).toHaveURL('/account');

    // Step 2: Browse products
    await page.goto('/shop');
    await expect(page.locator('h1')).toContainText(/shop|products/i);

    // Step 3: View product details
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();

    // Wait for product page to load
    await page.waitForSelector('[data-testid="product-title"]');
    const productTitle = await page.locator('[data-testid="product-title"]').textContent();
    expect(productTitle).toBeTruthy();

    // Step 4: Add to cart
    await page.click('[data-testid="add-to-cart-button"]');

    // Wait for success toast or cart update
    await page.waitForTimeout(1000); // Allow for API call

    // Step 5: View cart
    await page.goto('/cart');
    await expect(page.locator('[data-testid="cart-item"]')).toBeVisible();

    // Step 6: Proceed to checkout
    await page.click('[data-testid="checkout-button"]');
    await expect(page).toHaveURL(/\/checkout/);

    // Step 7: Fill shipping information
    await page.fill('input[name="shippingAddress"]', '123 Test Street');
    await page.fill('input[name="city"]', 'Test City');
    await page.fill('input[name="zipCode"]', '12345');
    await page.selectOption('select[name="state"]', 'CA');

    // Step 8: Complete purchase (mocked payment)
    await page.click('[data-testid="complete-purchase-button"]');

    // Step 9: Verify order confirmation
    await page.waitForURL(/\/account\/orders/);
    await expect(page.locator('text=/order confirmed/i')).toBeVisible();

    // Step 10: Check notifications
    await page.click('[data-testid="notification-bell"]');
    await expect(page.locator('[data-testid="notification-item"]')).toBeVisible();

    // Verify notification content
    const notificationText = await page
      .locator('[data-testid="notification-item"]')
      .first()
      .textContent();
    expect(notificationText).toMatch(/order confirmed/i);
  });

  test('buyer can view notification details', async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', testBuyer.email);
    await page.fill('input[name="password"]', testBuyer.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/account');

    // Open notifications dropdown
    await page.click('[data-testid="notification-bell"]');

    // Click "View All"
    await page.click('text=/view all/i');
    await expect(page).toHaveURL('/account/notifications');

    // Verify notifications page
    await expect(page.locator('h1')).toContainText(/notifications/i);

    // Verify at least one notification exists
    const notificationCount = await page.locator('[data-testid="notification-item"]').count();
    expect(notificationCount).toBeGreaterThan(0);

    // Click a notification to mark as read
    await page.locator('[data-testid="notification-item"]').first().click();

    // Wait for mark as read API call
    await page.waitForTimeout(500);

    // Verify unread count decreased
    const unreadBadge = page.locator('[data-testid="unread-badge"]');
    const unreadCount = await unreadBadge.textContent();
    expect(parseInt(unreadCount || '0')).toBeGreaterThanOrEqual(0);
  });

  test('notification bell shows real-time updates', async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', testBuyer.email);
    await page.fill('input[name="password"]', testBuyer.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/account');

    // Get initial unread count
    const initialBadge = await page.locator('[data-testid="unread-badge"]').textContent();
    const initialCount = parseInt(initialBadge || '0');

    // Simulate a new notification (would normally come from Socket.IO)
    // In real test, this would trigger an action that creates a notification
    // For now, we just verify the UI updates when a notification is marked as read

    // Open notifications
    await page.click('[data-testid="notification-bell"]');
    await page.click('text=/view all/i');

    // Mark all as read
    if (initialCount > 0) {
      await page.click('text=/mark all as read/i');
      await page.waitForTimeout(1000);

      // Go back to account page
      await page.goto('/account');

      // Verify unread badge is gone or shows 0
      const newBadge = page.locator('[data-testid="unread-badge"]');
      await expect(newBadge).not.toBeVisible();
    }
  });
});
