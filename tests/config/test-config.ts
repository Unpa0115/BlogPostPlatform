/**
 * テスト設定ファイル
 * 全テストで使用する共通設定を定義
 */

export const TEST_CONFIG = {
  // アプリケーション設定
  APP: {
    BASE_URL: process.env.BASE_URL || 'http://localhost:3005',
    DEFAULT_TIMEOUT: 30000,
    NAVIGATION_TIMEOUT: 10000,
    UPLOAD_TIMEOUT: 60000,
  },

  // テストデータ設定
  TEST_DATA: {
    SAMPLE_FILES: {
      AUDIO_MP3: 'sample-audio.mp3',
      AUDIO_WAV: 'sample-audio.wav',
      VIDEO_MP4: 'sample-video.mp4',
      LARGE_FILE: 'large-file.mp3',
      INVALID_FILE: 'invalid-file.txt',
    },
    DEFAULT_METADATA: {
      TITLE: 'E2Eテスト投稿',
      DESCRIPTION: 'Playwright自動テストで作成された投稿です',
      CATEGORY: 'テスト',
      TAGS: 'e2e,playwright,テスト',
    },
  },

  // プラットフォーム設定
  PLATFORMS: {
    YOUTUBE: {
      NAME: 'YouTube',
      TAB_VALUE: 'youtube',
      STATUS_SELECTOR: '[data-testid="youtube-status"]',
    },
    VOICY: {
      NAME: 'Voicy',
      TAB_VALUE: 'voicy',
      STATUS_SELECTOR: '[data-testid="voicy-status"]',
    },
    SPOTIFY: {
      NAME: 'Spotify',
      TAB_VALUE: 'spotify',
      STATUS_SELECTOR: '[data-testid="spotify-status"]',
    },
    OPENAI: {
      NAME: 'OpenAI',
      TAB_VALUE: 'openai',
      STATUS_SELECTOR: '[data-testid="openai-status"]',
    },
  },

  // セレクター設定
  SELECTORS: {
    // ナビゲーション
    NAVIGATION: {
      HOME_LINK: '[href="/"]',
      UPLOAD_LINK: '[href="/upload"]',
      PLATFORMS_LINK: '[href="/platforms"]',
      SETTINGS_LINK: '[href="/settings"]',
    },

    // ファイルアップロード
    UPLOAD: {
      FILE_INPUT: 'input[type="file"]',
      DROP_ZONE: '[data-testid="drop-zone"]',
      UPLOAD_BUTTON: '[data-testid="upload-button"]',
      UPLOAD_PROGRESS: '[data-testid="upload-progress"]',
      UPLOADED_FILE: '[data-testid="uploaded-file"]',
    },

    // メタデータフォーム
    METADATA: {
      TITLE_INPUT: '#title',
      DESCRIPTION_TEXTAREA: '#description',
      CATEGORY_INPUT: '#category',
      TAGS_INPUT: '#tags',
    },

    // 前処理
    PREPROCESSING: {
      TRIM_SILENCE_CHECKBOX: '#trimSilence',
      KEYWORD_INPUT: '#keyword',
      PREPROCESS_BUTTON: '[data-testid="preprocess-button"]',
    },

    // 配信管理
    DISTRIBUTION: {
      PLATFORM_CHECKBOX: (platform: string) => `[data-testid="${platform}-checkbox"]`,
      DISTRIBUTE_BUTTON: '[data-testid="distribute-button"]',
      DISTRIBUTION_STATUS: '[data-testid="distribution-status"]',
    },

    // 共通UI
    COMMON: {
      LOADING_SPINNER: '.animate-spin',
      TOAST: '[data-testid="toast"]',
      ERROR_MESSAGE: '[data-testid="error-message"]',
      SUCCESS_MESSAGE: '[data-testid="success-message"]',
    },

    // タブ
    TABS: {
      UPLOAD_TAB: '[data-value="upload"]',
      RSS_TAB: '[data-value="rss"]',
    },
  },

  // テストシナリオ設定
  SCENARIOS: {
    BASIC_UPLOAD: {
      NAME: '基本的なファイルアップロード',
      STEPS: [
        'ファイル選択',
        'メタデータ入力',
        'アップロード実行',
        '結果確認',
      ],
    },
    PLATFORM_SETUP: {
      NAME: 'プラットフォーム設定',
      STEPS: [
        'プラットフォーム選択',
        '認証情報入力',
        '設定保存',
        '接続確認',
      ],
    },
    FULL_DISTRIBUTION: {
      NAME: '完全配信フロー',
      STEPS: [
        'ファイルアップロード',
        'プラットフォーム設定',
        '配信実行',
        '結果確認',
      ],
    },
  },

  // パフォーマンス設定
  PERFORMANCE: {
    THRESHOLDS: {
      PAGE_LOAD_TIME: 3000, // 3秒
      UPLOAD_TIME: 10000, // 10秒（小さなファイル）
      PROCESSING_TIME: 30000, // 30秒
    },
  },

  // エラーハンドリング設定
  ERROR_HANDLING: {
    RETRY_COUNT: 3,
    RETRY_DELAY: 1000,
    EXPECTED_ERRORS: [
      'ファイルサイズが大きすぎます',
      'サポートされていないファイル形式です',
      'ネットワークエラーが発生しました',
    ],
  },

  // 環境別設定
  ENVIRONMENT: {
    LOCAL: {
      BASE_URL: 'http://localhost:3005',
      SLOW_MO: 100,
      HEADLESS: false,
    },
    CI: {
      BASE_URL: 'http://localhost:3005',
      SLOW_MO: 0,
      HEADLESS: true,
    },
  },
};

/**
 * 環境に応じた設定を取得
 */
export function getEnvironmentConfig() {
  const isCI = process.env.CI === 'true';
  return isCI ? TEST_CONFIG.ENVIRONMENT.CI : TEST_CONFIG.ENVIRONMENT.LOCAL;
}

/**
 * テストタイムアウト設定を取得
 */
export function getTimeoutConfig() {
  return {
    default: TEST_CONFIG.APP.DEFAULT_TIMEOUT,
    navigation: TEST_CONFIG.APP.NAVIGATION_TIMEOUT,
    upload: TEST_CONFIG.APP.UPLOAD_TIMEOUT,
  };
}

/**
 * プラットフォーム固有の設定を取得
 */
export function getPlatformConfig(platformName: string) {
  return TEST_CONFIG.PLATFORMS[platformName.toUpperCase() as keyof typeof TEST_CONFIG.PLATFORMS];
}