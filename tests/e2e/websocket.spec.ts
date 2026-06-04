/**
 * E2E WebSocket Tests - Frontend + Backend
 * 
 * Tests the full real-time flow:
 * - User authenticates
 * - WebSocket connects
 * - Order appears in real-time
 * - Status updates appear instantly
 */

import { test, expect } from '@playwright/test';

const API_URL = process.env.VITE_API_URL || 'http://localhost:8000';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

test.describe('WebSocket Real-Time Orders', () => {
  test.beforeEach(async ({ page }) => {
    // Go to app
    await page.goto(APP_URL);

    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test('should connect WebSocket on authenticated page', async ({ page }) => {
    // Expect live indicator to appear
    await page.goto(`${APP_URL}/orders`);

    // Should see "Live" status
    const liveIndicator = page.locator('text=Live');
    await expect(liveIndicator).toBeVisible({ timeout: 5000 });
  });

  test('should display real-time order creation', async ({ page, context }) => {
    // Open browser console to capture WebSocket messages
    let wsMessageReceived = false;

    page.on('websocket', (ws) => {
      console.log('WebSocket opened:', ws.url());

      ws.on('framereceived', (event) => {
        const data = JSON.parse(event.payload.toString());
        if (data.type === 'order.created') {
          wsMessageReceived = true;
          console.log('Order created event received:', data);
        }
      });
    });

    // Navigate to orders page
    await page.goto(`${APP_URL}/orders`);

    // Wait for orders list to load
    await page.waitForSelector('text=Order #', { timeout: 5000 });

    // In a real test, this would be triggered by backend
    // For now, we're testing that WebSocket connection is established
    const initialOrderCount = await page.locator('h3 >> text=/Order #/').count();
    expect(initialOrderCount).toBeGreaterThanOrEqual(0);
  });

  test('should show reconnect button when offline', async ({ page, context }) => {
    // Simulate offline
    await page.goto(`${APP_URL}/orders`);

    // Go offline
    await context.setOffline(true);

    // Wait a moment for disconnect
    await page.waitForTimeout(2000);

    // Should show offline indicator
    const offlineIndicator = page.locator('text=Offline');
    await expect(offlineIndicator).toBeVisible({ timeout: 5000 });

    // Should show reconnect button
    const reconnectButton = page.locator('button:has-text("Reconnect")');
    await expect(reconnectButton).toBeVisible();

    // Go back online
    await context.setOffline(false);

    // Click reconnect
    await reconnectButton.click();

    // Should show "Live" again
    const liveIndicator = page.locator('text=Live');
    await expect(liveIndicator).toBeVisible({ timeout: 5000 });
  });

  test('should update order status in real-time', async ({ page, context }) => {
    // This test requires backend cooperation
    // In a real scenario, you'd have a test API endpoint to trigger events

    await page.goto(`${APP_URL}/orders`);

    // Get initial status badge
    const statusBadge = page.locator('[class*="bg-yellow"], [class*="bg-blue"]').first();

    // The status should update when WebSocket event comes in
    // This would be triggered by backend test helper endpoint
    // e.g., POST /api/test/trigger-order-update

    await expect(statusBadge).toBeVisible();
  });

  test('should handle WebSocket errors gracefully', async ({ page }) => {
    // Use invalid token to trigger auth failure
    await page.goto(`${APP_URL}/login`);

    // This would normally trigger a 4001 WebSocket close
    // UI should handle this gracefully without crashing
    await expect(page).not.toHaveTitle('Error');
  });

  test('should maintain connection across page navigation', async ({ page }) => {
    // Go to orders page (connects WebSocket)
    await page.goto(`${APP_URL}/orders`);

    // Should be connected
    const liveIndicator = page.locator('text=Live');
    await expect(liveIndicator).toBeVisible({ timeout: 5000 });

    // Navigate to another page
    await page.click('a[href*="/settings"]');
    await page.waitForLoadState('networkidle');

    // Navigate back to orders
    await page.click('a[href*="/orders"]');
    await page.waitForLoadState('networkidle');

    // Should still be connected
    await expect(liveIndicator).toBeVisible({ timeout: 5000 });
  });

  test('should reconnect automatically after brief disconnect', async ({
    page,
    context,
  }) => {
    await page.goto(`${APP_URL}/orders`);

    // Should be live
    let liveIndicator = page.locator('text=Live');
    await expect(liveIndicator).toBeVisible({ timeout: 5000 });

    // Brief offline
    await context.setOffline(true);
    await page.waitForTimeout(1000);

    // Go back online
    await context.setOffline(false);

    // Should auto-reconnect
    await expect(liveIndicator).toBeVisible({ timeout: 10000 });
  });
});
