# Voicy設定ガイド

## 概要

BlogPostPlatformでは、Browserless.io + Playwrightを使用してVoicyへの自動配信を実現します。このガイドでは、Voicyのブラウザ自動化設定と配信方法を説明します。

## 前提条件

- Voicyアカウント
- Browserless.io API キー
- 音声ファイル（MP3、WAV、M4A形式）

## 1. Browserless.io設定

### API キーの取得

1. [Browserless.io](https://www.browserless.io/)にアクセス
2. アカウントを作成
3. API キーを取得

### 環境変数の設定

```bash
# 開発環境 (.env.local)
BROWSERLESS_API_KEY=your-browserless-api-key-here

# 本番環境 (Railway)
BROWSERLESS_API_KEY=your-browserless-api-key-here
```

## 2. Voicy自動化の実装

### ブラウザ自動化クライアント

```typescript
// src/lib/voicyAutomation.ts
import { chromium, Browser, Page } from 'playwright';

export class VoicyAutomation {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize(): Promise<void> {
    try {
      if (process.env.NODE_ENV === 'development') {
        // 開発環境: ローカルChrome使用
        console.log("Development mode: Using local Chrome browser...");
        this.browser = await chromium.launch({
          headless: false, // デバッグ用にブラウザを表示
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-images',
            '--disable-javascript',
            '--disable-default-apps',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-component-extensions-with-background-pages',
            '--memory-pressure-off',
            '--max_old_space_size=512',
            '--no-first-run',
            '--no-default-browser-check',
            '--single-process'
          ],
          timeout: 60000,
        });
      } else {
        // 本番環境: Browserless.io使用
        console.log("Production mode: Connecting to Browserless.io...");
        
        const browserlessApiKey = process.env.BROWSERLESS_API_KEY;
        if (!browserlessApiKey) {
          throw new Error("BROWSERLESS_API_KEY 環境変数が設定されていません");
        }
        
        console.log(`Using Browserless.io API key: ${browserlessApiKey.substring(0, 8)}...`);
        
        this.browser = await chromium.connect({
          wsEndpoint: `wss://chrome.browserless.io?token=${browserlessApiKey}`,
          timeout: 60000,
        });
      }

      this.page = await this.browser.newPage();
      await this.page.setViewportSize({ width: 1920, height: 1080 });
      
      console.log("Browser automation initialized successfully");
    } catch (error) {
      console.error("Failed to initialize browser automation:", error);
      throw error;
    }
  }

  async uploadToVoicy(
    audioFile: Buffer,
    metadata: {
      title: string;
      description: string;
      tags: string[];
      scheduledTime?: Date;
    }
  ): Promise<string> {
    try {
      if (!this.page) {
        throw new Error("Browser not initialized");
      }

      console.log("Starting Voicy upload process...");

      // 1. Voicyにログイン
      await this.loginToVoicy();

      // 2. 新規作成ページに移動
      await this.navigateToCreationPage();

      // 3. 音声ファイルをアップロード
      await this.uploadAudioFile(audioFile);

      // 4. メタデータを入力
      await this.fillMetadata(metadata);

      // 5. 配信予約（スケジュール設定）
      if (metadata.scheduledTime) {
        await this.scheduleBroadcast(metadata.scheduledTime);
      }

      // 6. 配信IDを取得
      const broadcastId = await this.getBroadcastId();

      console.log(`Voicy upload completed successfully. Broadcast ID: ${broadcastId}`);
      return broadcastId;

    } catch (error) {
      console.error("Voicy upload failed:", error);
      await this.takeScreenshot('error_screenshot.png');
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  private async loginToVoicy(): Promise<void> {
    console.log("Logging in to Voicy...");
    
    await this.page!.goto('https://voicy.jp/login');
    
    // ログインフォームの入力
    await this.page!.fill('input[name="email"]', process.env.VOICY_EMAIL!);
    await this.page!.fill('input[name="password"]', process.env.VOICY_PASSWORD!);
    
    // ログインボタンをクリック
    await this.page!.click('button[type="submit"]');
    
    // ログイン完了を待機
    await this.page!.waitForURL('https://voicy.jp/dashboard', { timeout: 10000 });
    
    console.log("Successfully logged in to Voicy");
  }

  private async navigateToCreationPage(): Promise<void> {
    console.log("Navigating to creation page...");
    
    // 新規作成ボタンをクリック
    await this.page!.click('button[data-testid="new-creation"]');
    
    // 新規配信ボタンをクリック
    await this.page!.click('button[data-testid="new-broadcast"]');
    
    // 作成ページの読み込みを待機
    await this.page!.waitForSelector('input[type="file"]', { timeout: 10000 });
    
    console.log("Successfully navigated to creation page");
  }

  private async uploadAudioFile(audioFile: Buffer): Promise<void> {
    console.log("Uploading audio file...");
    
    // ファイルアップロード要素を取得
    const fileInput = await this.page!.locator('input[type="file"]');
    
    // ファイルをアップロード
    await fileInput.setInputFiles({
      name: 'audio.mp3',
      mimeType: 'audio/mpeg',
      buffer: audioFile
    });
    
    // アップロード完了を待機
    await this.page!.waitForSelector('.upload-complete', { timeout: 30000 });
    
    console.log("Audio file uploaded successfully");
  }

  private async fillMetadata(metadata: {
    title: string;
    description: string;
    tags: string[];
  }): Promise<void> {
    console.log("Filling metadata...");
    
    // タイトルを入力
    await this.page!.fill('input[name="title"]', metadata.title);
    
    // 説明を入力
    await this.page!.fill('textarea[name="description"]', metadata.description);
    
    // タグを入力
    for (const tag of metadata.tags) {
      await this.page!.fill('input[name="tags"]', tag);
      await this.page!.keyboard.press('Enter');
    }
    
    console.log("Metadata filled successfully");
  }

  private async scheduleBroadcast(scheduledTime: Date): Promise<void> {
    console.log("Scheduling broadcast...");
    
    // 予約ボタンをクリック
    await this.page!.click('button[data-testid="schedule-button"]');
    
    // 日時を設定
    const dateString = scheduledTime.toISOString().split('T')[0];
    const timeString = scheduledTime.toTimeString().split(' ')[0];
    
    await this.page!.fill('input[name="date"]', dateString);
    await this.page!.fill('input[name="time"]', timeString);
    
    // 予約確定ボタンをクリック
    await this.page!.click('button[data-testid="confirm-schedule"]');
    
    console.log("Broadcast scheduled successfully");
  }

  private async getBroadcastId(): Promise<string> {
    // 配信IDを取得（URLから抽出またはAPIから取得）
    const currentUrl = this.page!.url();
    const match = currentUrl.match(/\/broadcast\/([a-zA-Z0-9]+)/);
    return match ? match[1] : 'unknown';
  }

  private async takeScreenshot(filename: string): Promise<void> {
    try {
      await this.page!.screenshot({ path: `screenshots/voicy/${filename}` });
      console.log(`Screenshot saved: ${filename}`);
    } catch (error) {
      console.error("Failed to take screenshot:", error);
    }
  }

  private async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      console.log("Browser automation cleaned up");
    } catch (error) {
      console.error("Cleanup failed:", error);
    }
  }
}
```

## 3. Voicy認証情報の管理

### 認証情報の暗号化保存

```typescript
// src/lib/voicy-service.ts
import { encryptData, decryptData } from './encryption';

export interface VoicyCredentials {
  email: string;
  password: string;
}

export async function saveVoicyCredentials(credentials: VoicyCredentials): Promise<void> {
  const encryptedCredentials = encryptData(
    JSON.stringify(credentials),
    process.env.ENCRYPTION_KEY!
  );

  // データベースに保存
  await prisma.platformCredentials.upsert({
    where: { platform: 'voicy' },
    update: { credentials: encryptedCredentials },
    create: { platform: 'voicy', credentials: encryptedCredentials }
  });
}

export async function getVoicyCredentials(): Promise<VoicyCredentials> {
  const record = await prisma.platformCredentials.findUnique({
    where: { platform: 'voicy' }
  });

  if (!record) {
    throw new Error('Voicy credentials not found');
  }

  const decryptedData = decryptData(record.credentials, process.env.ENCRYPTION_KEY!);
  return JSON.parse(decryptedData);
}
```

## 4. APIエンドポイントの実装

### アップロードAPI

```typescript
// src/app/api/platforms/voicy-upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { VoicyAutomation } from '@/lib/voicyAutomation';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const tags = (formData.get('tags') as string).split(',').map(tag => tag.trim());
    const scheduledTime = formData.get('scheduledTime') as string;

    // 音声ファイルをバッファに変換
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    // Voicy自動化を実行
    const automation = new VoicyAutomation();
    await automation.initialize();

    const broadcastId = await automation.uploadToVoicy(audioBuffer, {
      title,
      description,
      tags,
      scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined
    });

    return NextResponse.json({
      success: true,
      broadcastId,
      message: 'Voicy upload completed successfully'
    });

  } catch (error) {
    console.error('Voicy upload error:', error);
    return NextResponse.json(
      { error: 'Voicy upload failed', details: error.message },
      { status: 500 }
    );
  }
}
```

## 5. エラーハンドリング

### よくあるエラーと対処法

```typescript
// src/lib/voicyAutomation.ts
export class VoicyError extends Error {
  constructor(
    message: string,
    public code: string,
    public screenshot?: string
  ) {
    super(message);
    this.name = 'VoicyError';
  }
}

// エラーハンドリングの改善
private async handleError(error: any, context: string): Promise<void> {
  console.error(`Voicy error in ${context}:`, error);
  
  // スクリーンショットを撮影
  await this.takeScreenshot(`error_${context}_${Date.now()}.png`);
  
  // エラー情報をログに記録
  console.error('Error context:', {
    context,
    timestamp: new Date().toISOString(),
    userAgent: await this.page?.evaluate(() => navigator.userAgent),
    url: this.page?.url()
  });
  
  throw new VoicyError(
    `Voicy automation failed in ${context}: ${error.message}`,
    'VOICY_AUTOMATION_ERROR'
  );
}
```

## 6. 設定とカスタマイズ

### 環境別設定

```typescript
// src/lib/voicyAutomation.ts
interface VoicyConfig {
  headless: boolean;
  timeout: number;
  retryAttempts: number;
  screenshotOnError: boolean;
}

function getVoicyConfig(): VoicyConfig {
  if (process.env.NODE_ENV === 'development') {
    return {
      headless: false,
      timeout: 30000,
      retryAttempts: 3,
      screenshotOnError: true
    };
  } else {
    return {
      headless: true,
      timeout: 60000,
      retryAttempts: 5,
      screenshotOnError: true
    };
  }
}
```

### リトライ機能

```typescript
// src/lib/voicyAutomation.ts
private async retryOperation<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxAttempts) {
        await this.delay(1000 * attempt); // 指数バックオフ
      }
    }
  }
  
  throw lastError!;
}

private delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## 7. テスト方法

### 単体テスト

```typescript
// tests/voicy-automation.test.ts
import { VoicyAutomation } from '@/lib/voicyAutomation';

describe('VoicyAutomation', () => {
  let automation: VoicyAutomation;

  beforeEach(() => {
    automation = new VoicyAutomation();
  });

  it('should initialize browser automation', async () => {
    await expect(automation.initialize()).resolves.not.toThrow();
  });

  it('should handle login errors gracefully', async () => {
    // テスト実装
  });
});
```

### 統合テスト

```typescript
// tests/integration/voicy-upload.test.ts
describe('Voicy Upload Integration', () => {
  it('should upload audio file to Voicy', async () => {
    const testAudio = Buffer.from('test audio data');
    const metadata = {
      title: 'テスト配信',
      description: 'テスト用の配信です',
      tags: ['テスト']
    };

    const automation = new VoicyAutomation();
    await automation.initialize();

    const broadcastId = await automation.uploadToVoicy(testAudio, metadata);
    expect(broadcastId).toBeDefined();
  });
});
```

## 8. トラブルシューティング

### よくある問題

1. **ログインエラー**
   - 認証情報の確認
   - 2FAの設定確認
   - アカウントロックの確認

2. **アップロードエラー**
   - ファイル形式の確認
   - ファイルサイズの確認
   - ネットワーク接続の確認

3. **ブラウザ自動化エラー**
   - Browserless.io API キーの確認
   - ブラウザバージョンの確認
   - タイムアウト設定の調整

### デバッグ方法

```bash
# 詳細ログの有効化
DEBUG=voicy:* npm run dev

# スクリーンショットの確認
ls screenshots/voicy/

# ログの確認
npm run logs:voicy
```

## 9. パフォーマンス最適化

### 並列処理

```typescript
// 複数ファイルの並列アップロード
export async function batchUploadToVoicy(
  audioFiles: Array<{ buffer: Buffer; metadata: any }>
): Promise<{ success: string[]; failed: string[] }> {
  const results = await Promise.allSettled(
    audioFiles.map(async ({ buffer, metadata }) => {
      const automation = new VoicyAutomation();
      await automation.initialize();
      return automation.uploadToVoicy(buffer, metadata);
    })
  );

  return {
    success: results.filter(r => r.status === 'fulfilled').map(r => r.value),
    failed: results.filter(r => r.status === 'rejected').map(r => r.reason)
  };
}
```

### キャッシュ設定

```typescript
// 認証情報のキャッシュ
export class VoicyCredentialsCache {
  private static cache = new Map<string, VoicyCredentials>();
  private static cacheTimeout = 30 * 60 * 1000; // 30分

  static async getCredentials(): Promise<VoicyCredentials> {
    const cached = this.cache.get('voicy');
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.credentials;
    }

    const credentials = await getVoicyCredentials();
    this.cache.set('voicy', {
      credentials,
      timestamp: Date.now()
    });

    return credentials;
  }
}
```

## 次のステップ

1. [YouTube設定](./youtube.md)を確認
2. [Spotify設定](./spotify.md)を確認
3. [トラブルシューティング](../troubleshooting/)を参照 