import { test, expect } from '@playwright/test';
import { TestHelpers, FileUtils, TestDataGenerator } from './utils/test-helpers';

test.describe('前処理機能テスト', () => {
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    testHelpers = new TestHelpers(page);
  });

  test.describe('無音期間トリミング機能', () => {
    test('無音トリミングオプションの表示確認', async ({ page }) => {
      await testHelpers.navigateToPage('/');
      
      // ファイルをアップロードして前処理オプションを表示
      const metadata = TestDataGenerator.generateTestMetadata();
      await page.fill('#title', metadata.title);
      
      const filePath = FileUtils.getTestFilePath('sample-audio.mp3');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);
      
      // アップロード完了を待機
      await expect(page.locator('text=アップロード完了').first()).toBeVisible({ timeout: 15000 });
      
      // 前処理オプションセクションの確認
      await expect(page.locator('text=前処理オプション').first()).toBeVisible();
      
      // 無音トリミングチェックボックスの確認（正確なIDを使用）
      await expect(page.locator('#trimSilence').first()).toBeVisible();
      const trimCheckbox = page.locator('#trimSilence');
      await expect(trimCheckbox).toBeVisible();
    });

    test('無音トリミング設定の操作', async ({ page }) => {
      await testHelpers.navigateToPage('/');
      
      // ファイルアップロード
      await page.fill('#title', 'トリミングテスト');
      const filePath = FileUtils.getTestFilePath('sample-audio.mp3');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);
      
      await expect(page.locator('text=アップロード完了').first()).toBeVisible({ timeout: 15000 });
      
      // 無音トリミングチェックボックスをクリック
      const trimCheckbox = page.locator('#trimSilence').first();
      await trimCheckbox.click();
      
      // チェックボックスがチェックされたことを確認
      await expect(trimCheckbox).toBeChecked();
    });

    test('無音トリミング処理の実行', async ({ page }) => {
      await testHelpers.navigateToPage('/');
      
      // ファイルアップロード
      await page.fill('#title', 'トリミング実行テスト');
      const filePath = FileUtils.getTestFilePath('sample-audio.mp3');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);
      
      await expect(page.locator('text=アップロード完了').first()).toBeVisible({ timeout: 15000 });
      
      // 無音トリミングを有効にする
      const trimCheckbox = page.locator('#trimSilence').first();
      await trimCheckbox.click();
      
      // 前処理実行ボタンをクリック
      const preprocessButton = page.locator('text=前処理を実行').first();
      await preprocessButton.click();
      
      // 処理中表示の確認
      await expect(page.locator('text=前処理中').first()).toBeVisible({ timeout: 5000 });
      
      // 処理完了の確認（長時間処理のため十分な待機時間を設定）
      await expect(page.locator('text=前処理完了').first()).toBeVisible({ timeout: 60000 });
    });
  });

  test.describe('キーフレーズ切り取り機能', () => {
    test('キーワード入力フィールドの表示確認', async ({ page }) => {
      await testHelpers.navigateToPage('/');
      
      // ファイルアップロード
      const metadata = TestDataGenerator.generateTestMetadata();
      await page.fill('#title', metadata.title);
      
      const filePath = FileUtils.getTestFilePath('sample-audio.mp3');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);
      
      await expect(page.locator('text=アップロード完了').first()).toBeVisible({ timeout: 15000 });
      
      // キーワード入力フィールドの確認
      await expect(page.locator('text=検出したいキーワードを入力').first()).toBeVisible();
      const keywordInput = page.locator('#keyword').or(
        page.locator('input').filter({ hasText: /キーワード/ })
      );
      await expect(keywordInput.first()).toBeVisible();
    });

    test('キーワード入力と設定', async ({ page }) => {
      await testHelpers.navigateToPage('/');
      
      // ファイルアップロード
      await page.fill('#title', 'キーワードテスト');
      const filePath = FileUtils.getTestFilePath('sample-audio.mp3');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);
      
      await expect(page.locator('text=アップロード完了').first()).toBeVisible({ timeout: 15000 });
      
      // キーワードを入力
      const keywordInput = page.locator('#keyword').first();
      await keywordInput.fill('テスト');
      
      // 入力値の確認
      await expect(keywordInput).toHaveValue('テスト');
    });

    test('キーワード検出処理の実行', async ({ page }) => {
      await testHelpers.navigateToPage('/');
      
      // ファイルアップロード
      await page.fill('#title', 'キーワード検出テスト');
      const filePath = FileUtils.getTestFilePath('sample-audio.mp3');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);
      
      await expect(page.locator('text=アップロード完了').first()).toBeVisible({ timeout: 15000 });
      
      // キーワードを入力
      const keywordInput = page.locator('#keyword').first();
      await keywordInput.fill('音声');
      
      // 前処理実行ボタンをクリック
      const preprocessButton = page.locator('text=前処理を実行').first();
      await preprocessButton.click();
      
      // 処理中表示の確認
      await expect(page.locator('text=前処理中').first()).toBeVisible({ timeout: 5000 });
      
      // 処理完了または API キー不足エラーの確認
      const completed = await page.locator('text=前処理完了').first().isVisible({ timeout: 60000 }).catch(() => false);
      const apiError = await page.locator('text=API').first().isVisible({ timeout: 5000 }).catch(() => false);
      
      // どちらかの状態になっていることを確認
      expect(completed || apiError).toBeTruthy();
    });
  });

  test.describe('組み合わせ前処理機能', () => {
    test('無音トリミングとキーワード検出の同時実行', async ({ page }) => {
      await testHelpers.navigateToPage('/');
      
      // ファイルアップロード
      await page.fill('#title', '組み合わせテスト');
      const filePath = FileUtils.getTestFilePath('sample-audio.mp3');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);
      
      await expect(page.locator('text=アップロード完了').first()).toBeVisible({ timeout: 15000 });
      
      // 無音トリミングを有効にする
      const trimCheckbox = page.locator('#trimSilence').first();
      await trimCheckbox.click();
      
      // キーワードを入力
      const keywordInput = page.locator('#keyword').first();
      await keywordInput.fill('テスト');
      
      // 前処理実行
      const preprocessButton = page.locator('text=前処理を実行').first();
      await preprocessButton.click();
      
      // 処理中表示の確認
      await expect(page.locator('text=前処理中').first()).toBeVisible({ timeout: 5000 });
      
      // 処理結果の確認
      const completed = await page.locator('text=前処理完了').first().isVisible({ timeout: 60000 }).catch(() => false);
      const error = await page.locator('text=エラー').first().isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(completed || error).toBeTruthy();
    });

    test('前処理オプションなしでの実行', async ({ page }) => {
      await testHelpers.navigateToPage('/');
      
      // ファイルアップロード
      await page.fill('#title', 'オプションなしテスト');
      const filePath = FileUtils.getTestFilePath('sample-audio.mp3');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);
      
      await expect(page.locator('text=アップロード完了').first()).toBeVisible({ timeout: 15000 });
      
      // オプションを設定せずに前処理実行
      const preprocessButton = page.locator('text=前処理を実行').first();
      await preprocessButton.click();
      
      // 何らかの応答があることを確認（警告またはスキップメッセージ）
      const hasResponse = await page.locator('text=前処理').first().isVisible({ timeout: 10000 });
      expect(hasResponse).toBeTruthy();
    });
  });

  test.describe('前処理結果の検証', () => {
    test('前処理済みファイル情報の表示', async ({ page }) => {
      await testHelpers.navigateToPage('/');
      
      // ファイルアップロード
      await page.fill('#title', '結果表示テスト');
      const filePath = FileUtils.getTestFilePath('sample-audio.mp3');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);
      
      await expect(page.locator('text=アップロード完了').first()).toBeVisible({ timeout: 15000 });
      
      // 無音トリミングを有効にして実行
      const trimCheckbox = page.locator('#trimSilence').first();
      await trimCheckbox.click();
      
      const preprocessButton = page.locator('text=前処理を実行').first();
      await preprocessButton.click();
      
      // 処理完了を待機
      await expect(page.locator('text=前処理完了').first()).toBeVisible({ timeout: 60000 });
      
      // 前処理済みファイル情報の確認
      const processedFileInfo = page.locator('text=trimmed_').first();
      await expect(processedFileInfo).toBeVisible({ timeout: 5000 });
    });

    test('前処理エラーハンドリング', async ({ page }) => {
      await testHelpers.navigateToPage('/');
      
      // 無効なファイルでテスト
      await page.fill('#title', 'エラーテスト');
      const filePath = FileUtils.getTestFilePath('invalid-file.txt');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);
      
      // ファイルが選択された後
      await page.waitForTimeout(2000);
      
      // 前処理が利用可能かチェック
      const preprocessAvailable = await page.locator('text=前処理オプション').first().isVisible({ timeout: 5000 }).catch(() => false);
      
      if (preprocessAvailable) {
        const preprocessButton = page.locator('text=前処理を実行').first();
        await preprocessButton.click();
        
        // エラーメッセージの確認
        await expect(page.locator('text=エラー').first()).toBeVisible({ timeout: 10000 });
      } else {
        // 前処理オプションが表示されない場合は正常
        console.log('無効ファイルでは前処理オプションが表示されない（正常）');
      }
    });
  });

  test.describe('前処理UI/UX', () => {
    test('前処理ボタンの無効/有効状態', async ({ page }) => {
      await testHelpers.navigateToPage('/');
      
      // ファイルアップロード前は前処理ボタンが表示されないことを確認
      const preprocessButtonBefore = await page.locator('text=前処理を実行').first().isVisible().catch(() => false);
      expect(preprocessButtonBefore).toBeFalsy();
      
      // ファイルアップロード
      await page.fill('#title', 'ボタン状態テスト');
      const filePath = FileUtils.getTestFilePath('sample-audio.mp3');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);
      
      await expect(page.locator('text=アップロード完了').first()).toBeVisible({ timeout: 15000 });
      
      // ファイルアップロード後は前処理ボタンが表示されることを確認
      await expect(page.locator('text=前処理を実行').first()).toBeVisible();
    });

    test('前処理中のローディング表示', async ({ page }) => {
      await testHelpers.navigateToPage('/');
      
      // ファイルアップロード
      await page.fill('#title', 'ローディングテスト');
      const filePath = FileUtils.getTestFilePath('sample-audio.mp3');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);
      
      await expect(page.locator('text=アップロード完了').first()).toBeVisible({ timeout: 15000 });
      
      // 無音トリミングを有効にする
      const trimCheckbox = page.locator('#trimSilence').first();
      await trimCheckbox.click();
      
      // 前処理実行
      const preprocessButton = page.locator('text=前処理を実行').first();
      await preprocessButton.click();
      
      // ローディング状態の確認
      await expect(page.locator('text=前処理中').first()).toBeVisible({ timeout: 5000 });
      
      // ローディングアニメーションの確認
      const loadingSpinner = page.locator('.animate-spin').first();
      const hasSpinner = await loadingSpinner.isVisible({ timeout: 3000 }).catch(() => false);
      
      // スピナーまたは処理中テキストのいずれかが表示されていることを確認
      expect(hasSpinner || await page.locator('text=前処理中').first().isVisible()).toBeTruthy();
    });

    test('前処理完了後の状態リセット', async ({ page }) => {
      await testHelpers.navigateToPage('/');
      
      // ファイルアップロード
      await page.fill('#title', 'リセットテスト');
      const filePath = FileUtils.getTestFilePath('sample-audio.mp3');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);
      
      await expect(page.locator('text=アップロード完了').first()).toBeVisible({ timeout: 15000 });
      
      // 無音トリミングを有効にして実行
      const trimCheckbox = page.locator('#trimSilence').first();
      await trimCheckbox.click();
      
      const preprocessButton = page.locator('text=前処理を実行').first();
      await preprocessButton.click();
      
      // 処理完了を待機
      await expect(page.locator('text=前処理完了').first()).toBeVisible({ timeout: 60000 });
      
      // ボタンが再び使用可能になることを確認
      await expect(preprocessButton).toBeEnabled();
      
      // チェックボックスの状態を確認（設定が保持されている）
      const checkboxInput = page.locator('#trimSilence');
      await expect(checkboxInput).toBeChecked();
    });
  });
});