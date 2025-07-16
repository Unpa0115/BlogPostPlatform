import { Page, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * テストユーティリティクラス
 * 共通的なテスト操作を提供します
 */
export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * アプリケーションのベースURLを取得
   */
  static getBaseUrl(): string {
    return process.env.BASE_URL || 'http://localhost:3005';
  }

  /**
   * 指定したページへの遷移と読み込み完了を待機
   */
  async navigateToPage(path: string = ''): Promise<void> {
    const url = `${TestHelpers.getBaseUrl()}${path}`;
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 要素の表示を待機
   */
  async waitForElement(selector: string, timeout: number = 10000): Promise<void> {
    await this.page.waitForSelector(selector, { timeout });
  }

  /**
   * 要素のテキストを取得
   */
  async getElementText(selector: string): Promise<string> {
    return await this.page.locator(selector).textContent() || '';
  }

  /**
   * フォーム入力を実行
   */
  async fillForm(formData: Record<string, string>): Promise<void> {
    for (const [fieldName, value] of Object.entries(formData)) {
      await this.page.fill(`[name="${fieldName}"]`, value);
    }
  }

  /**
   * ファイルアップロード操作
   */
  async uploadFile(inputSelector: string, filePath: string): Promise<void> {
    const fileInput = this.page.locator(inputSelector);
    await fileInput.setInputFiles(filePath);
  }

  /**
   * ボタンクリックと処理完了を待機
   */
  async clickAndWait(buttonSelector: string, waitSelector?: string): Promise<void> {
    await this.page.click(buttonSelector);
    
    if (waitSelector) {
      await this.page.waitForSelector(waitSelector);
    } else {
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * タブの切り替え
   */
  async switchTab(tabName: string): Promise<void> {
    await this.page.click(`[data-value="${tabName}"]`);
    await this.page.waitForTimeout(500); // タブ切り替えのアニメーション待機
  }

  /**
   * トーストメッセージの確認
   */
  async waitForToast(expectedMessage?: string): Promise<void> {
    await this.page.waitForSelector('[data-testid="toast"]', { timeout: 5000 });
    
    if (expectedMessage) {
      const toastText = await this.getElementText('[data-testid="toast"]');
      expect(toastText).toContain(expectedMessage);
    }
  }

  /**
   * 処理中インジケーターの表示・非表示を確認
   */
  async waitForProcessing(processingSelector: string = '.animate-spin'): Promise<void> {
    // 処理中インジケーターの表示を待機
    await this.page.waitForSelector(processingSelector, { timeout: 5000 });
    
    // 処理中インジケーターの非表示を待機
    await this.page.waitForSelector(processingSelector, { state: 'hidden', timeout: 30000 });
  }

  /**
   * プラットフォームの接続状態を確認
   */
  async checkPlatformStatus(platformName: string): Promise<string> {
    const statusBadge = this.page.locator(`[data-testid="${platformName}-status"]`);
    return await statusBadge.textContent() || '';
  }

  /**
   * データベースの初期化（テスト用）
   */
  async initializeTestDatabase(): Promise<void> {
    // テスト用データベースの初期化API呼び出し
    await this.page.evaluate(() => {
      return fetch('/api/test/init-db', { method: 'POST' });
    });
  }

  /**
   * アップロードされたファイルの確認
   */
  async verifyUploadedFile(fileName: string): Promise<void> {
    const uploadedFile = this.page.locator(`[data-testid="uploaded-file"]:has-text("${fileName}")`);
    await expect(uploadedFile).toBeVisible();
  }

  /**
   * スクリーンショットの撮影
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `tests/screenshots/${name}.png` });
  }

  /**
   * ページのパフォーマンス指標を取得
   */
  async getPerformanceMetrics(): Promise<Record<string, number>> {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        totalTime: navigation.loadEventEnd - navigation.navigationStart
      };
    });
  }

  /**
   * 要素の存在確認
   */
  async elementExists(selector: string): Promise<boolean> {
    return await this.page.locator(selector).count() > 0;
  }

  /**
   * 複数要素の数を取得
   */
  async getElementCount(selector: string): Promise<number> {
    return await this.page.locator(selector).count();
  }

  /**
   * 前処理機能のセットアップ
   */
  async setupPreprocessing(options: {
    trimSilence?: boolean;
    keyword?: string;
  } = {}): Promise<void> {
    // 無音トリミングの設定
    if (options.trimSilence) {
      const trimCheckbox = this.page.locator('#trimSilence');
      await trimCheckbox.click();
    }

    // キーワードの設定
    if (options.keyword) {
      const keywordInput = this.page.locator('#keyword');
      await keywordInput.fill(options.keyword);
    }
  }

  /**
   * 前処理の実行と結果確認
   */
  async executePreprocessing(timeoutMs: number = 60000): Promise<string> {
    // 前処理実行ボタンをクリック
    const preprocessButton = this.page.locator('text=前処理を実行').first();
    await preprocessButton.click();

    // 処理中表示の確認
    await expect(this.page.locator('text=前処理中').first()).toBeVisible({ timeout: 5000 });

    // 処理完了またはエラーの確認
    const completed = await this.page.locator('text=前処理完了').first().isVisible({ timeout: timeoutMs }).catch(() => false);
    const error = await this.page.locator('text=エラー').first().isVisible({ timeout: 5000 }).catch(() => false);

    if (completed) {
      return 'completed';
    } else if (error) {
      return 'error';
    } else {
      return 'timeout';
    }
  }

  /**
   * 前処理結果ファイルの確認
   */
  async verifyPreprocessedFile(): Promise<boolean> {
    return await this.page.locator('text=trimmed_').first().isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * ローカルストレージの操作
   */
  async setLocalStorage(key: string, value: string): Promise<void> {
    await this.page.evaluate(({key, value}) => {
      localStorage.setItem(key, value);
    }, {key, value});
  }

  async getLocalStorage(key: string): Promise<string | null> {
    return await this.page.evaluate((key) => {
      return localStorage.getItem(key);
    }, key);
  }
}

/**
 * テストデータジェネレーター
 */
export class TestDataGenerator {
  /**
   * ランダムなファイル名を生成
   */
  static generateRandomFileName(extension: string = 'mp3'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `test-${timestamp}-${random}.${extension}`;
  }

  /**
   * テスト用メタデータを生成
   */
  static generateTestMetadata(): Record<string, string> {
    const timestamp = Date.now();
    return {
      title: `テスト投稿 ${timestamp}`,
      description: `これは自動テストで作成された投稿です。作成日時: ${new Date().toISOString()}`,
      category: 'テスト',
      tags: 'テスト,自動化,playwright'
    };
  }

  /**
   * テスト用認証情報を生成
   */
  static generateTestCredentials(): Record<string, string> {
    return {
      email: 'test@example.com',
      password: 'test-password-123',
      apiKey: 'test-api-key-12345',
      rssFeedUrl: 'https://example.com/rss-feed.xml'
    };
  }
}

/**
 * ファイルユーティリティ
 */
export class FileUtils {
  /**
   * テストファイルのパスを取得
   */
  static getTestFilePath(fileName: string): string {
    return path.join(__dirname, '..', 'fixtures', fileName);
  }

  /**
   * テストファイルの存在確認
   */
  static testFileExists(fileName: string): boolean {
    return fs.existsSync(this.getTestFilePath(fileName));
  }

  /**
   * テストファイルのサイズを取得
   */
  static getTestFileSize(fileName: string): number {
    const filePath = this.getTestFilePath(fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Test file not found: ${fileName}`);
    }
    return fs.statSync(filePath).size;
  }

  /**
   * テスト用の小さなファイルを作成
   */
  static createTestFile(fileName: string, content: string = 'test content'): string {
    const filePath = this.getTestFilePath(fileName);
    fs.writeFileSync(filePath, content);
    return filePath;
  }
}

/**
 * 共通的なアサーション
 */
export class CommonAssertions {
  /**
   * ページタイトルの確認
   */
  static async verifyPageTitle(page: Page, expectedTitle: string): Promise<void> {
    await expect(page).toHaveTitle(expectedTitle);
  }

  /**
   * 要素の表示確認
   */
  static async verifyElementVisible(page: Page, selector: string): Promise<void> {
    await expect(page.locator(selector)).toBeVisible();
  }

  /**
   * 要素のテキスト確認
   */
  static async verifyElementText(page: Page, selector: string, expectedText: string): Promise<void> {
    await expect(page.locator(selector)).toHaveText(expectedText);
  }

  /**
   * フォームの入力値確認
   */
  static async verifyFormValue(page: Page, selector: string, expectedValue: string): Promise<void> {
    await expect(page.locator(selector)).toHaveValue(expectedValue);
  }

  /**
   * URLの確認
   */
  static async verifyUrl(page: Page, expectedUrl: string): Promise<void> {
    await expect(page).toHaveURL(expectedUrl);
  }
}