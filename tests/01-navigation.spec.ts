import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';
import { TEST_CONFIG } from './config/test-config';

test.describe('基本ナビゲーションテスト', () => {
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    testHelpers = new TestHelpers(page);
  });

  test('ホームページが正常に表示される', async ({ page }) => {
    await testHelpers.navigateToPage('/');
    
    // ページタイトルの確認
    await expect(page).toHaveTitle(/BlogPostPlatform/);
    
    // メインヘッダーの確認
    await expect(page.locator('h1')).toContainText('BlogPostPlatform');
    
    // localhost表示の確認
    await expect(page.locator('h1')).toContainText('localhost');
  });

  test('アップロードページへの遷移', async ({ page }) => {
    await testHelpers.navigateToPage('/upload');
    
    // URLの確認
    await expect(page).toHaveURL(/\/upload$/);
    
    // ページタイトルの確認
    await expect(page.locator('h1')).toContainText('ファイルアップロード');
    
    // ファイルアップロードエリアの確認（hiddenクラスがあるため親要素を確認）
    await expect(page.locator('text=ここに動画・音声ファイルをドラッグ＆ドロップ')).toBeVisible();
  });

  test('プラットフォーム設定ページへの遷移', async ({ page }) => {
    await testHelpers.navigateToPage('/platforms');
    
    // URLの確認
    await expect(page).toHaveURL(/\/platforms$/);
    
    // ページタイトルの確認
    await expect(page.locator('h1')).toContainText('プラットフォーム設定');
    
    // プラットフォームタブの確認（role tabを使用）
    await expect(page.getByRole('tab', { name: 'YouTube' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Voicy' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Spotify' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '前処理設定' })).toBeVisible();
  });

  test('設定ページへの遷移', async ({ page }) => {
    await testHelpers.navigateToPage('/settings');
    
    // URLの確認
    await expect(page).toHaveURL(/\/settings$/);
    
    // 設定コンテンツの確認
    await expect(page.locator('body')).toBeVisible();
  });

  test('ホームページのタブ切り替え', async ({ page }) => {
    await testHelpers.navigateToPage('/');
    
    // 新規アップロードタブの確認
    await expect(page.getByRole('tab', { name: '新規アップロード' })).toBeVisible();
    
    // RSS Feed管理タブの確認
    await expect(page.getByRole('tab', { name: 'RSS Feed管理・配信' })).toBeVisible();
    
    // RSS Feed管理タブに切り替え
    await page.getByRole('tab', { name: 'RSS Feed管理・配信' }).click();
    
    // タブの内容が変わったことを確認（より具体的なテキストで確認）
    await expect(page.locator('text=RSS Feed統計')).toBeVisible();
  });

  test('レスポンシブデザインの確認', async ({ page }) => {
    await testHelpers.navigateToPage('/');
    
    // デスクトップサイズ
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();
    
    // タブレットサイズ
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();
    
    // モバイルサイズ
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('統計情報の表示', async ({ page }) => {
    await testHelpers.navigateToPage('/');
    
    // 統計カードの確認（実際のカードタイトルを確認）
    await expect(page.locator('text=総アップロード数')).toBeVisible();
    await expect(page.locator('text=処理中ジョブ')).toBeVisible();
    
    // 最近のアップロード情報の確認
    await expect(page.locator('text=最近のアップロード')).toBeVisible();
  });

  test('認証通知の表示', async ({ page }) => {
    await testHelpers.navigateToPage('/');
    
    // 認証通知エリアの確認（実際のコンポーネントタイトルを確認）
    await expect(page.locator('text=認証通知')).toBeVisible();
  });

  test('ページ読み込み時間の確認', async ({ page }) => {
    const startTime = Date.now();
    await testHelpers.navigateToPage('/');
    const endTime = Date.now();
    
    const loadTime = endTime - startTime;
    expect(loadTime).toBeLessThan(TEST_CONFIG.PERFORMANCE.THRESHOLDS.PAGE_LOAD_TIME);
  });
});