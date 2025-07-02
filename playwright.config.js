// playwright.config.js
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  // Chromiumのみ使用（高速化）
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // ヘッドレスモード強制
        headless: true,
        // リソース節約
        viewport: { width: 1280, height: 720 },
      },
    },
    // Firefox、Safariは削除
  ],
  
  // 同時実行数を制限（メモリ節約）
  workers: process.env.CI ? 1 : 2,
  
  // タイムアウト短縮
  timeout: 30000,
  
  // 不要な機能を無効化
  use: {
    // スクリーンショットは必要時のみ
    screenshot: 'only-on-failure',
    // 動画録画無効
    video: 'off',
    // トレース無効
    trace: 'off',
  },
  
  // テストディレクトリ設定
  testDir: './tests',
  
  // レポート設定
  reporter: 'html',
  
  // グローバル設定
  globalSetup: undefined,
  globalTeardown: undefined,
}); 