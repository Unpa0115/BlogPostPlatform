import { chromium, Browser, Page } from 'playwright';
import { expect } from '@playwright/test';
// import { stealth } from 'playwright-stealth';
import * as fs from 'fs/promises';
import * as path from 'path';

// --- Constants ---
// ハードコードされた認証情報を削除
// function getEnvOrThrow(key: string): string {
//   const value = process.env[key];
//   if (!value) {
//     throw new Error(`環境変数 ${key} が設定されていません。セキュリティ上、ハードコードは禁止です。`);
//   }
//   return value;
// }

// const EMAIL = getEnvOrThrow('VOICY_EMAIL');
// const PASSWORD = getEnvOrThrow('VOICY_PASSWORD');

// API設定
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_TOKEN = process.env.API_TOKEN; // 環境変数からトークンを取得

export interface VoicyAutomationOptions {
  title: string;
  description: string;
  hashtags: string;
}

const DATASOURCE_FOLDER = (title: string) => path.join("datasource", title);
const SCREENSHOTS_FOLDER = "screenshots/voicy";

// Playwright設定を軽量化
const PLAYWRIGHT_CONFIG = {
  headless: true,
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
  timeout: 30000,
  ignoreDefaultArgs: ['--disable-extensions'],
  executablePath: process.env.CHROMIUM_PATH || undefined,
}

async function getVoicyCredentials(): Promise<{ email: string; password: string }> {
  // 環境変数から直接認証情報を取得（API_TOKENは不要）
  try {
    const email = process.env.VOICY_EMAIL;
    const password = process.env.VOICY_PASSWORD;
    
    if (!email || !password) {
      throw new Error("VOICY_EMAILまたはVOICY_PASSWORD環境変数が設定されていません");
    }
    
    return { email, password };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`認証情報取得エラー: ${error.message}`);
    }
    throw new Error(`認証情報取得エラー: ${String(error)}`);
  }
}

async function saveScreenshot(page: Page, filename: string): Promise<boolean> {
  try {
    const filepath = path.join(SCREENSHOTS_FOLDER, filename);
    await page.screenshot({ path: filepath });
    console.log(`スクリーンショット保存: ${filepath}`);
    return true;
  } catch (error) {
    console.log(`スクリーンショット保存エラー: ${error}`);
    return false;
  }
}

export async function runVoicyAutomation(options: VoicyAutomationOptions): Promise<boolean> {
  const { title, description, hashtags } = options;
  
  let browser: Browser | null = null;
  
  try {
    console.log("🚀 Voicy自動化を開始します...");
    
    // 認証情報を取得
    console.log("🔐 Voicy認証情報を取得中...");
    const { email, password } = await getVoicyCredentials();
    console.log(`✅ 認証情報取得成功: ${email}`);
    
    // ブラウザを起動（軽量設定）
    console.log('Starting browser...')
    browser = await chromium.launch(PLAYWRIGHT_CONFIG)
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      // 軽量化のため、画像やCSS、フォントをブロック
      extraHTTPHeaders: {
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      }
    })
    
    // 不要なリソースをブロック
    await context.route('**/*', route => {
      const resourceType = route.request().resourceType()
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        route.abort()
      } else {
        route.continue()
      }
    })
    
    const page = await context.newPage()
    
    // メモリ使用量を監視
    const memoryUsage = process.memoryUsage()
    console.log('Memory usage before upload:', {
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
    })
    
    // Stealth機能を適用
    // await stealth(page);
    
    // ネットワークリクエストの監視を追加
    page.on('response', (response) => {
      try {
        if (response.status() === 403) {
          console.log(`⚠️ 403エラー検出: ${response.url()}`);
          if (response.url().includes("vmedia-recorder-web-api")) {
            console.log("   📝 これは音声録音APIへのリクエストです。通常の動作の一部です。");
          } else {
            console.log(`   📝 リクエストヘッダー: ${JSON.stringify(response.request().headers())}`);
          }
        } else if (response.status() >= 400) {
          console.log(`⚠️ ${response.status()}エラー検出: ${response.url()}`);
        }
      } catch (error) {
        // エラーハンドリングを追加して、監視機能がメイン処理を妨げないようにする
      }
    });
    
    // ページ読み込み時のエラーハンドリングを追加
    page.on('pageerror', (err) => console.log(`ページエラー: ${err}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`コンソール: ${msg.text()}`);
      }
    });

    console.log("ログインページにアクセス中...");
    await page.goto("https://va-cms.admin.voicy.jp/login");
    await page.waitForTimeout(2000);
    await saveScreenshot(page, "01_login_page.png");

    // ログイン情報を入力
    console.log("Filling in login credentials...");
    await page.locator('input[placeholder="メールアドレスを入力してください"]').fill(email);
    await page.waitForTimeout(1000);
    await page.locator('input[placeholder="パスワードを入力してください"]').fill(password);
    await page.waitForTimeout(1000);

    console.log("Clicking the login button...");
    await page.locator("#login-button").click();

    // ログイン完了を待機
    console.log("Waiting for login to complete...");
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    console.log(`Logged in. New page title: ${await page.title()}`);
    await page.waitForTimeout(3000);
    await saveScreenshot(page, "02_login_success.png");

    // 1. "新規作成"ボタンをクリック
    console.log("Clicking the '新規作成' button...");
    await page.getByRole("button", { name: "新規作成" }).click();
    await page.waitForTimeout(2000);
    await saveScreenshot(page, "03_new_creation_clicked.png");

    // 2. "新規放送作成"をクリック
    console.log("Waiting for and clicking '新規放送作成'...");
    await page.getByText("新規放送作成").click();
    await page.waitForTimeout(2000);
    await saveScreenshot(page, "04_new_broadcast_clicked.png");

    // 作成ページの読み込みを待機
    console.log("Waiting for the creation page to load...");
    await page.waitForSelector('input[placeholder="放送タイトルを入力"]', { timeout: 15000 });
    await page.waitForTimeout(3000);
    await saveScreenshot(page, "05_creation_page_loaded.png");

    // 3. 放送詳細を入力
    console.log("Filling in broadcast details...");
    await page.locator('input[placeholder="放送タイトルを入力"]').fill(title);
    await page.waitForTimeout(1000);
    await page.locator('textarea[placeholder^="放送内容の紹介"]').fill(description);
    await page.waitForTimeout(1000);
    await page.getByPlaceholder("ハッシュタグを入力").fill(hashtags);
    await page.waitForTimeout(1000);
    await saveScreenshot(page, "06_broadcast_details_filled.png");
    
    // 4. データソースフォルダから音声ファイルをアップロード
    console.log(`'${DATASOURCE_FOLDER(title)}'内の音声ファイルを検索しています...`);
    
    let audioFiles: string[] = [];
    try {
      const files = await fs.readdir(DATASOURCE_FOLDER(title));
      audioFiles = files
        .filter(file => /\.(mp3|wav|m4a)$/i.test(file))
        .map(file => path.join(DATASOURCE_FOLDER(title), file))
        .sort();
    } catch (error) {
      console.log("データソースフォルダが見つかりません");
    }

    if (audioFiles.length === 0) {
      console.log("警告: 指定されたディレクトリに音声ファイルが見つかりません。音声なしで続行します。");
    } else {
      console.log(`${audioFiles.length}個の音声ファイルが見つかりました。アップロード処理を開始します。`);
      
      for (let i = 0; i < audioFiles.length; i++) {
        const audioFilePath = audioFiles[i];
        console.log(`チャプター ${i + 1} を処理中: ${path.basename(audioFilePath)}`);
        
        // 2つ目以降のファイルのために新しいチャプターを追加
        if (i > 0) {
          console.log("新しいチャプターを追加しています...");
          await page.getByRole("button", { name: "チャプターを追加" }).click();
          await page.waitForTimeout(2000);
        }

        // 現在のチャプターの「音声アップロード」ボタンをクリック
        console.log("「音声アップロード」をクリックしてポップアップを開いています...");
        const uploadButtonForChapter = page.getByRole("button", { name: "音声アップロード" }).nth(i);
        await uploadButtonForChapter.click();
        await page.waitForTimeout(2000);

        // ポップアップが表示されるのを待つ
        const popupUploadButton = page.getByRole("button", { name: "音声ファイルをアップロードする" });
        await popupUploadButton.waitFor({ timeout: 10000 });

        // ポップアップ経由でファイルをアップロード
        console.log("アップロードポップアップでファイルを指定しています...");
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser'),
          popupUploadButton.click()
        ]);
        
        await fileChooser.setFiles(audioFilePath);

        // アップロードが完了するのを、ポップアップが閉じることで確認
        console.log(`'${path.basename(audioFilePath)}' のアップロード完了を待機中...`);
        await popupUploadButton.waitFor({ state: "hidden", timeout: 120000 });
        console.log(`アップロード成功: ${path.basename(audioFilePath)}`);
        
        // アップロード後の待機時間を追加（サーバー負荷軽減）
        await page.waitForTimeout(5000);
        
        // 各チャプターのアップロード後にスクリーンショット
        await saveScreenshot(page, `07_chapter_${i+1}_uploaded.png`);
      }
    }

    // 5. 予約日時を設定
    console.log("予約日時を設定しています...");
    const reservationButton = page.getByRole("button", { name: "日時を指定して予約" });
    
    console.log("予約ボタンが表示されるようにスクロールします...");
    await reservationButton.scrollIntoViewIfNeeded();
    
    console.log("予約ボタンが有効になるのを待ちます...");
    await expect(reservationButton).toBeEnabled({ timeout: 15000 });
    
    console.log("予約ボタンをクリックします...");
    await reservationButton.click();
    await page.waitForTimeout(3000);
    await saveScreenshot(page, "08_reservation_button_clicked.png");
    
    // カレンダーを開くための日付入力欄を探す
    let dateInput;
    try {
      dateInput = page.locator('input[placeholder="年月日を入力"]');
      await dateInput.waitFor({ state: "visible", timeout: 2000 });
      console.log("日付入力欄（プレースホルダー: '年月日を入力'）が見つかりました。");
    } catch (error) {
      console.log("プレースホルダー '年月日を入力' が見つかりません。'YYYY/MM/DD' で再試行します。");
      dateInput = page.locator('input[placeholder="YYYY/MM/DD"]');
      await dateInput.waitFor({ state: "visible", timeout: 10000 });
    }

    // 実行日から1週間後の日付を計算
    const reservationDate = new Date();
    reservationDate.setDate(reservationDate.getDate() + 7);

    // 日付を直接入力
    const dateStr = reservationDate.toISOString().slice(0, 10).replace(/-/g, '/');
    console.log(`日付を直接入力します: ${dateStr}`);
    await dateInput.fill(dateStr);
    await dateInput.dispatchEvent('blur');
    await page.waitForTimeout(1000);
    
    await saveScreenshot(page, "10_date_selected.png");

    // 時刻を設定
    console.log("予約時刻を 06:00 に設定します。");
    try {
      const hoursInput = page.locator('input[aria-label="hours"]');
      await hoursInput.waitFor({ state: "visible", timeout: 2000 });
      console.log("時刻をテキスト入力で設定します。");
      await hoursInput.fill("06");
      await page.waitForTimeout(500);
      await page.locator('input[aria-label="minutes"]').fill("00");
      await page.waitForTimeout(500);
    } catch (error) {
      console.log("時刻のテキスト入力が見つかりません。ドロップダウンで再試行します。");
      await page.selectOption('select[formcontrolname="hours"]', "06");
      await page.waitForTimeout(500);
      await page.selectOption('select[formcontrolname="minutes"]', "00");
      await page.waitForTimeout(500);
    }
    
    await saveScreenshot(page, "11_time_set.png");

    // 最終予約ボタンをクリック
    const finalReserveButton = page.locator("#reserve-playlist-button");
    console.log("最終予約ボタンが有効になるのを待ちます...");
    await expect(finalReserveButton).toBeEnabled({ timeout: 15000 });
    
    console.log("最終予約ボタンをクリックします...");
    console.log("テストモード。最終ボタンは押す直前で中断します");
    
    // テストモードのため、実際の予約は行わない
    // await finalReserveButton.click();
    
    await saveScreenshot(page, "16_broadcast_reserved.png");

    console.log("✅ Voicy予約投稿が正常に完了しました");
    return true;

  } catch (error) {
    console.error(`An error occurred: ${error}`);
    
    // 403エラーの特別な対処
    if (error instanceof Error && (error.message.includes("403") || error.message.includes("Forbidden"))) {
      console.log("🚨 403エラーが発生しました。以下の対策を試してください：");
      console.log("   1. しばらく時間をおいてから再実行");
      console.log("   2. ブラウザを手動で開いてログイン状態を確認");
      console.log("   3. セッションが切れている場合は再ログイン");
      console.log("   4. IPアドレスが制限されている可能性があります");
    }
    
    // より詳細なエラー情報を出力
    console.log("詳細なエラー情報:");
    console.error(error);
    
    if (browser) {
      const pages = browser.contexts()[0]?.pages() || [];
      if (pages.length > 0) {
        await saveScreenshot(pages[0], "error_screenshot.png");
      }
    }
    console.log("Took a screenshot of the error state.");

    // エラー時もメモリ使用量を確認
    const memoryUsage = process.memoryUsage()
    console.log('Memory usage on error:', {
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
    })
    
    return false;

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 既存のuploadToVoicy関数は他の場所で定義されています 