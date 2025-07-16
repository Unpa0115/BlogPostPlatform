import { chromium, Browser, Page, BrowserContext } from 'playwright';
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
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3005';
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
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

      // メモリ使用量の監視
    const startMemory = process.memoryUsage();
    console.log(`🚀 開始時メモリ使用量: ${Math.round(startMemory.heapUsed / 1024 / 1024)}MB`);
    
    const logMemoryUsage = () => {
      const currentMemory = process.memoryUsage();
      console.log(`📊 現在のメモリ使用量: ${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB`);
    };
  
  try {
    console.log("=== Voicy Automation Start ===");
    console.log("Options:", options);
    
    // メモリ使用量をログ
    const memUsage = process.memoryUsage();
    console.log(`Memory usage before upload: { rss: '${Math.round(memUsage.rss / 1024 / 1024)}MB', heapUsed: '${Math.round(memUsage.heapUsed / 1024 / 1024)}MB' }`);

    // Voicy認証情報を取得
    const { email, password } = await getVoicyCredentials();
    if (!email || !password) {
      throw new Error("Voicy認証情報が設定されていません");
    }

    // 環境分岐によるブラウザ起動
    if (process.env.NODE_ENV === 'development') {
      console.log("Development mode: Using local Chrome browser...");
      browser = await chromium.launch({
        headless: false, // デバッグ用にブラウザを表示
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-plugins',
                     '--enable-dom-storage', // DOMストレージを有効化
                     '--enable-javascript', // JavaScriptを明示的に有効化
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
      console.log("Production mode: Connecting to Browserless.io...");
      
      // 環境変数の確認
      const browserlessApiKey = process.env.BROWSERLESS_API_KEY;
      if (!browserlessApiKey) {
        throw new Error("BROWSERLESS_API_KEY 環境変数が設定されていません");
      }
      
      console.log(`Using Browserless.io API key: ${browserlessApiKey.substring(0, 8)}...`);
      
      browser = await chromium.connect({
        wsEndpoint: `wss://chrome.browserless.io?token=${browserlessApiKey}`,
        timeout: 60000,
      });
    }

    // ブラウザコンテキスト作成
    console.log("Creating browser context...");
    const contextOptions = {
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8',
      },
    };

    context = await browser.newContext(contextOptions);

    // ページ作成
    console.log("Creating page...");
    page = await context.newPage();
    
    // ページの安定性を向上させる設定
    await page.setDefaultTimeout(30000);
    await page.setDefaultNavigationTimeout(30000);
    
    // ネットワークリクエストの監視を追加（Python実装と同様）
    page.on("response", (response) => {
      try {
        if (response.status() === 403) {
          console.log(`⚠️ 403エラー検出: ${response.url()}`);
          // 403エラーの詳細情報を記録
          if (response.url().includes("vmedia-recorder-web-api")) {
            console.log("   📝 これは音声録音APIへのリクエストです。通常の動作の一部です。");
          } else {
            console.log(`   📝 リクエストヘッダー: ${JSON.stringify(response.request().headers())}`);
          }
        } else if (response.status() >= 400) {
          console.log(`⚠️ ${response.status()}エラー検出: ${response.url()}`);
        }
      } catch (e) {
        // エラーハンドリングを追加して、監視機能がメイン処理を妨げないようにする
      }
    });
    
    // ページ読み込み時のエラーハンドリングを追加
    page.on("pageerror", (err) => console.log(`ページエラー: ${err}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.log(`コンソール: ${msg.text()}`);
      }
    });
    
    // リソース読み込みの最適化（JavaScriptとCSSは許可）
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      const url = route.request().url();
      
      // JavaScriptとCSSは必ず許可（UIの動作に必要）
      if (resourceType === 'script' || resourceType === 'stylesheet') {
        route.continue();
        return;
      }
      
      // 画像とフォントのみブロック（パフォーマンス向上）
      if (['image', 'font'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // ネットワーク監視の改善
    page.on('response', (response) => {
      try {
        if (response.status() >= 500) {
          console.log(`🚨 ${response.status()}サーバーエラー: ${response.url()}`);
          console.log(`   📝 レスポンスヘッダー: ${JSON.stringify(response.headers())}`);
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
      // デバッグ用にすべてのコンソールメッセージを出力
      if (process.env.NODE_ENV === 'development') {
        console.log(`コンソール[${msg.type()}]: ${msg.text()}`);
      }
    });
    
    // DOM変更の監視（デバッグ用）
    await page.evaluate(() => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'disabled') {
            const target = mutation.target as Element;
            console.log('DOM変更検出:', target, 'disabled属性:', target.hasAttribute('disabled'));
          }
        });
      });
      observer.observe(document.body, { attributes: true, subtree: true });
    });

    console.log("ログインページにアクセス中...");
    logMemoryUsage(); // メモリ使用量をログ
    
    try {
      // より安定したページ遷移
      await page.goto("https://va-cms.admin.voicy.jp/login", { 
        waitUntil: 'domcontentloaded', 
        timeout: 45000 
      });
      
      // ページが完全に読み込まれるまで待機
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      
    } catch (gotoError) {
      console.error('page.gotoでエラー:', gotoError);
      
      // スクリーンショット保存を試行
      try {
        if (page) {
          await saveScreenshot(page, "error_screenshot.png");
        }
      } catch (screenshotError) {
        console.error('スクリーンショット保存エラー:', screenshotError);
      }
      
      throw new Error(`page.goto失敗: ${gotoError instanceof Error ? gotoError.message : String(gotoError)}`);
    }
    
    await page.waitForTimeout(3000);
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
    await page.locator('input[placeholder="放送タイトルを入力"]').fill(options.title);
    await page.waitForTimeout(1000);
    await page.locator('textarea[placeholder^="放送内容の紹介"]').fill(options.description);
    await page.waitForTimeout(1000);
    await page.getByPlaceholder("ハッシュタグを入力").fill(options.hashtags);
    await page.waitForTimeout(1000);
    await saveScreenshot(page, "06_broadcast_details_filled.png");
    
    // 4. データソースフォルダから音声ファイルをアップロード
    console.log(`'${DATASOURCE_FOLDER(options.title)}'内の音声ファイルを検索しています...`);
    
    let audioFiles: string[] = [];
    try {
      const files = await fs.readdir(DATASOURCE_FOLDER(options.title));
      audioFiles = files
        .filter(file => /\.(mp3|wav|m4a)$/i.test(file))
        .map(file => path.join(DATASOURCE_FOLDER(options.title), file))
        .sort();
      
      // 最新のファイルのみを使用（重複アップロード防止）
      if (audioFiles.length > 1) {
        console.log(`⚠️ ${audioFiles.length}個のファイルが見つかりました。最新のファイルのみを使用します。`);
        const latestFile = audioFiles[audioFiles.length - 1];
        audioFiles = [latestFile];
        console.log(`📁 使用するファイル: ${path.basename(latestFile)}`);
      }
    } catch (error) {
      console.log("データソースフォルダが見つかりません");
    }

    if (audioFiles.length === 0) {
      console.log("警告: 指定されたディレクトリに音声ファイルが見つかりません。音声なしで続行します。");
    } else {
      console.log(`${audioFiles.length}個の音声ファイルをアップロードします。`);
      
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
    await reservationButton.waitFor({ state: "visible", timeout: 15000 });
    
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

    // 最終予約ボタンをクリック（Python実装に合わせた改善版）
    const finalReserveButton = page.locator("#reserve-playlist-button");
    console.log("最終予約ボタンが有効になるのを待ちます...");
    
    // ボタンが表示されるまで待機
    await finalReserveButton.waitFor({ state: "visible", timeout: 15000 });
    
    // ボタンが有効になるまで待機（disabled属性がなくなるまで）
    console.log("ボタンの有効化を待機中...");
    await page.waitForFunction(() => {
      const button = document.querySelector("#reserve-playlist-button");
      return button && !button.hasAttribute('disabled') && !button.classList.contains('disabled');
    }, { timeout: 30000 });
    
    // 【テストモード】実際の投稿処理はコメントアウト
    console.log("🚫 テストモード: 最終投稿処理は実行されません");
    console.log("📋 予約ボタンが準備できましたが、実際のクリックはスキップします");
    
    // 投稿直前のスクリーンショットを撮影
    await saveScreenshot(page, "12_final_reserve_ready_but_not_clicked.png");
    
    // 実際の投稿処理（コメントアウト済み）
    // ダイアログハンドラを事前に登録（クリック前に重要）
    // let dialogHandled = false;
    // const handleDialog = (dialog: any) => {
    //   console.log(`ダイアログ検出: ${dialog.message()}`);
    //   console.log(`ダイアログタイプ: ${dialog.type()}`);
    //   dialog.accept(); // 「OK」を自動で押す
    //   dialogHandled = true;
    //   console.log("ダイアログを自動でOKしました");
    // };
    
    // ダイアログハンドラを登録（1回だけ）
    // page.once("dialog", handleDialog);
    
    // console.log("ボタンが有効になりました。クリックします...");
    // await finalReserveButton.click();
    // await saveScreenshot(page, "12_final_reserve_clicked.png");
    
    // ダイアログが処理されたか確認
    // if (dialogHandled) {
    //   console.log("確認ダイアログが正常に処理されました");
    //   await saveScreenshot(page, "13_confirmation_accepted.png");
    // } else {
    //   console.log("ダイアログは表示されませんでした。予約が直接完了した可能性があります。");
    // }
    
    // 「設定が完了しました。」の緑のポップアップを検出
    // console.log("完了メッセージのポップアップを検出中...");
    // try {
    //   // 複数の方法で完了メッセージを検出
    //   const completionMessage = page.locator(
    //     'text=設定が完了しました。, text=完了しました, text=予約が完了'
    //   );
    //   await completionMessage.waitFor({ state: "visible", timeout: 10000 });
    //   console.log("完了メッセージを検出しました");
    //   
    //   await page.waitForTimeout(1000);
    //   await saveScreenshot(page, "15_completion_popup.png");
    //   console.log("完了ポップアップのスクリーンショットを保存しました");
    //   
    //   await completionMessage.waitFor({ state: "hidden", timeout: 15000 });
    //   console.log("完了ポップアップが自動で消えました");
    //   
    // } catch (completionError) {
    //   console.log("完了メッセージの検出中にエラーが発生しました:", completionError);
    // }
    
    // console.log("予約が完了し、ページが遷移しました。スクリーンショットを撮影します。");
    // await saveScreenshot(page, "16_broadcast_reserved.png");
    
    console.log("📸 テストモード完了: 投稿直前の状態でスクリーンショットを保存しました");
    await saveScreenshot(page, "16_test_mode_completed.png");
    
    // 【テストモード】予約完了後の詳細確認もコメントアウト
    // console.log("予約完了後の状態を確認しています...");
    // try {
    //   // ページタイトルやURLの確認
    //   console.log(`現在のページタイトル: ${await page.title()}`);
    //   console.log(`現在のURL: ${page.url()}`);
    //   
    //   // 予約完了を示す要素を探す
    //   const successIndicators = [
    //     "予約完了",
    //     "放送予約",
    //     "予約済み",
    //     "完了",
    //     "success"
    //   ];
    //   
    //   for (const indicator of successIndicators) {
    //     try {
    //       const element = page.locator(`text=${indicator}`);
    //       const count = await element.count();
    //       if (count > 0) {
    //         console.log(`✅ 成功指標を発見: '${indicator}'`);
    //         break;
    //       }
    //     } catch (error) {
    //       continue;
    //     }
    //   }
    //   
    //   // エラー要素がないか確認
    //   const errorIndicators = [
    //     "エラー",
    //     "失敗",
    //     "error",
    //     "failed"
    //   ];
    //   
    //   for (const indicator of errorIndicators) {
    //     try {
    //       const element = page.locator(`text=${indicator}`);
    //       const count = await element.count();
    //       if (count > 0) {
    //         console.log(`⚠️ エラー指標を発見: '${indicator}'`);
    //       }
    //     } catch (error) {
    //       continue;
    //     }
    //   }
    //   
    // } catch (statusError) {
    //   console.log("状態確認中にエラーが発生しました:", statusError);
    // }
    
    // 【重要】実際の投稿処理は完全にコメントアウト済み
    console.log("⚠️ 【テストモード】実際の投稿処理は実行されません");
    console.log("🔧 実際の投稿を行う場合は、voicyAutomation.tsの以下の処理のコメントアウトを解除してください:");
    console.log("   - ダイアログハンドラの登録");
    console.log("   - finalReserveButton.click()");
    console.log("   - 確認ダイアログの処理");
    console.log("   - 完了メッセージの検出");
    
    // 環境変数による投稿許可設定も削除（テストモードを徹底）
    console.log("🚫 環境変数 ENABLE_VOICY_SUBMISSION が 'true' でも実際の投稿は実行されません");
    console.log("📋 すべての投稿処理がコメントアウトされています")

    console.log("✅ Voicy自動化が完了しました");
    return true;

  } catch (error) {
    console.error("❌ Voicy自動化でエラーが発生しました:", error);
    console.error("詳細なエラー情報:");
    console.error("Error:", error instanceof Error ? error.message : String(error));
    console.error("Stack:", error instanceof Error ? error.stack : 'No stack trace');
    
    // 403エラーの特別な対処（Python実装と同様）
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
      console.log("🚨 403エラーが発生しました。以下の対策を試してください：");
      console.log("   1. しばらく時間をおいてから再実行");
      console.log("   2. ブラウザを手動で開いてログイン状態を確認");
      console.log("   3. セッションが切れている場合は再ログイン");
      console.log("   4. IPアドレスが制限されている可能性があります");
    }
    
    // メモリ使用量をログ
    const memUsage = process.memoryUsage();
    console.log(`Memory usage on error: { rss: '${Math.round(memUsage.rss / 1024 / 1024)}MB', heapUsed: '${Math.round(memUsage.heapUsed / 1024 / 1024)}MB' }`);
    
    // エラー時のスクリーンショットを試行
    try {
      if (page) {
        await saveScreenshot(page, "error_screenshot.png");
        console.log("Took a screenshot of the error state.");
      }
    } catch (screenshotError) {
      console.error("スクリーンショット保存エラー:", screenshotError);
    }
    
    return false;
    
  } finally {
    // リソースの確実なクリーンアップ
    console.log("🧹 Cleaning up resources...");
    
    try {
      if (page) {
        console.log("Closing page...");
        await page.close();
      }
    } catch (pageError) {
      console.error("Page close error:", pageError);
    }
    
    try {
      if (context) {
        console.log("Closing context...");
        await context.close();
      }
    } catch (contextError) {
      console.error("Context close error:", contextError);
    }
    
    try {
      if (browser) {
        console.log("Closing browser...");
        await browser.close();
      }
    } catch (browserError) {
      console.error("Browser close error:", browserError);
    }
    
    console.log("✅ Resource cleanup completed");
  }
}

// 既存のuploadToVoicy関数は他の場所で定義されています 