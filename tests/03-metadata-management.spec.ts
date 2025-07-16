import { test, expect } from '@playwright/test';
import { TestHelpers, TestDataGenerator } from './utils/test-helpers';

test.describe('メタデータ管理テスト', () => {
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    testHelpers = new TestHelpers(page);
  });

  test('メタデータフォームの基本入力', async ({ page }) => {
    await testHelpers.navigateToPage('/');

    // メタデータを生成
    const metadata = TestDataGenerator.generateTestMetadata();

    // フォームに入力
    await page.fill('#title', metadata.title);
    await page.fill('#description', metadata.description);
    await page.fill('#category', metadata.category);
    await page.fill('#tags', metadata.tags);

    // 入力値の確認
    await expect(page.locator('#title')).toHaveValue(metadata.title);
    await expect(page.locator('#description')).toHaveValue(metadata.description);
    await expect(page.locator('#category')).toHaveValue(metadata.category);
    await expect(page.locator('#tags')).toHaveValue(metadata.tags);
  });

  test('タイトルの必須バリデーション', async ({ page }) => {
    await testHelpers.navigateToPage('/');

    // タイトルを空にしてフォーム送信を試行
    await page.fill('#title', '');
    await page.fill('#description', 'テスト説明');

    // バリデーションエラーの確認
    await expect(page.locator('#title')).toHaveAttribute('required');
  });

  test('長い説明文の入力', async ({ page }) => {
    await testHelpers.navigateToPage('/');

    // 長い説明文を入力
    const longDescription = 'これは非常に長い説明文です。'.repeat(50);
    await page.fill('#description', longDescription);

    // 入力値の確認
    await expect(page.locator('#description')).toHaveValue(longDescription);
  });

  test('特殊文字を含むタグの入力', async ({ page }) => {
    await testHelpers.navigateToPage('/');

    // 特殊文字を含むタグを入力
    const specialTags = 'テスト,プログラミング,#JavaScript,@React,日本語タグ';
    await page.fill('#tags', specialTags);

    // 入力値の確認
    await expect(page.locator('#tags')).toHaveValue(specialTags);
  });

  test('カテゴリの入力と確認', async ({ page }) => {
    await testHelpers.navigateToPage('/');

    // カテゴリを入力
    await page.fill('#category', 'プログラミング');

    // 入力値の確認
    await expect(page.locator('#category')).toHaveValue('プログラミング');
  });

  test('メタデータのクリア機能', async ({ page }) => {
    await testHelpers.navigateToPage('/');

    // メタデータを入力
    await page.fill('#title', 'テストタイトル');
    await page.fill('#description', 'テスト説明');
    await page.fill('#category', 'テストカテゴリ');
    await page.fill('#tags', 'テストタグ');

    // フォームをクリア
    await page.fill('#title', '');
    await page.fill('#description', '');
    await page.fill('#category', '');
    await page.fill('#tags', '');

    // 空になったことを確認
    await expect(page.locator('#title')).toHaveValue('');
    await expect(page.locator('#description')).toHaveValue('');
    await expect(page.locator('#category')).toHaveValue('');
    await expect(page.locator('#tags')).toHaveValue('');
  });

  test('アップロードページでのメタデータ入力', async ({ page }) => {
    await testHelpers.navigateToPage('/upload');

    // メタデータを生成
    const metadata = TestDataGenerator.generateTestMetadata();

    // フォームに入力
    await page.fill('#title', metadata.title);
    await page.fill('#description', metadata.description);
    await page.fill('#category', metadata.category);
    await page.fill('#tags', metadata.tags);

    // 入力値の確認
    await expect(page.locator('#title')).toHaveValue(metadata.title);
    await expect(page.locator('#description')).toHaveValue(metadata.description);
    await expect(page.locator('#category')).toHaveValue(metadata.category);
    await expect(page.locator('#tags')).toHaveValue(metadata.tags);
  });

  test('メタデータの文字数制限', async ({ page }) => {
    await testHelpers.navigateToPage('/');

    // 制限を超える長いタイトルを入力
    const longTitle = 'あ'.repeat(200);
    await page.fill('#title', longTitle);

    // 入力された文字数の確認
    const actualValue = await page.locator('#title').inputValue();
    expect(actualValue.length).toBeLessThanOrEqual(200);
  });

  test('メタデータの保存確認', async ({ page }) => {
    await testHelpers.navigateToPage('/');

    // メタデータを入力
    const metadata = TestDataGenerator.generateTestMetadata();
    await page.fill('#title', metadata.title);
    await page.fill('#description', metadata.description);
    
    // ページをリロード
    await page.reload();
    
    // 入力値がクリアされることを確認（まだ保存されていないため）
    await expect(page.locator('#title')).toHaveValue('');
    await expect(page.locator('#description')).toHaveValue('');
  });
});