# システムアーキテクチャ

BlogPostPlatformのシステム設計と技術仕様について説明します。

## 🏗️ システム概要

### アーキテクチャ図

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   External      │
│   (Next.js)     │◄──►│   (API Routes)  │◄──►│   Services      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UI Components │    │   Database      │    │   OpenAI        │
│   (React)       │    │   (SQLite)      │    │   Whisper API   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   State Mgmt    │    │   Encryption    │    │   YouTube       │
│   (Context)     │    │   (AES-256)     │    │   Data API      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   File Upload   │    │   Credential    │    │   Browserless   │
│   (Multer)      │    │   Storage       │    │   (Voicy)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ 技術スタック

### フロントエンド

```typescript
// 主要技術
const frontendStack = {
  framework: "Next.js 14.2.25",
  language: "TypeScript 5.2.2",
  ui: "React 18.2.0",
  styling: "Tailwind CSS 3.4.1",
  components: "Shadcn/ui + Radix UI",
  icons: "Lucide React 0.446.0",
  state: "React Context + Custom Hooks",
};
```

### バックエンド

```typescript
// 主要技術
const backendStack = {
  runtime: "Node.js 18+",
  framework: "Next.js API Routes",
  database: "SQLite 3 + sqlite library",
  authentication: "Custom JWT + bcryptjs",
  encryption: "Node.js crypto + bcryptjs",
  fileProcessing: "Multer + fluent-ffmpeg",
};
```

### 外部サービス

```typescript
// 外部API
const externalServices = {
  openai: "Whisper API + GPT-4o-mini",
  youtube: "YouTube Data API v3",
  browserless: "Browserless.io + Playwright",
  railway: "Railway Deployment Platform",
  spotify: "RSS Feed Generation",
  voicy: "Browser Automation",
};
```

## 📁 ディレクトリ構造

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # 認証関連
│   │   ├── platforms/     # プラットフォーム連携
│   │   ├── uploads/       # ファイルアップロード
│   │   └── rss/           # RSS Feed生成
│   ├── globals.css        # グローバルスタイル
│   ├── layout.tsx         # ルートレイアウト
│   └── page.tsx           # ホームページ
├── components/            # Reactコンポーネント
│   ├── ui/               # 共通UIコンポーネント
│   ├── upload-form.tsx   # アップロードフォーム
│   └── distribution-manager.tsx # 配信管理
├── lib/                  # ユーティリティライブラリ
│   ├── database.ts       # データベース接続
│   ├── encryption.ts     # 暗号化機能
│   ├── voicyAutomation.ts # Voicy自動化
│   └── youtube.ts        # YouTube API
├── hooks/                # カスタムフック
│   ├── use-platforms.ts # プラットフォーム管理
│   └── use-toast.ts     # 通知管理
├── contexts/             # React Context
│   └── auth-context.tsx # 認証コンテキスト
└── types/               # TypeScript型定義
    └── index.ts         # 共通型定義
```

## 🔐 セキュリティ設計

### 認証情報の暗号化

```typescript
// src/lib/auth.ts
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// JWT_SECRETの取得（本番環境では必須）
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET環境変数が設定されていません。本番環境では必須です。')
    }
    
    // 開発環境でも最低限の強度を保つ
    const devSecret = process.env.NODE_ENV === 'development' 
      ? 'dev-secret-key-minimum-32-chars-long-for-security'
      : undefined
    
    if (!devSecret) {
      throw new Error('JWT_SECRET環境変数が設定されていません。')
    }
    
    console.warn('⚠️  開発環境のデフォルトJWT_SECRETを使用しています。本番環境では必ず独自の値を設定してください。')
    return devSecret
  }
  
  if (secret.length < 32) {
    throw new Error('JWT_SECRETは32文字以上である必要があります。')
  }
  
  return secret
}

// ユーザー登録時のパスワードハッシュ化
export async function registerUser(email: string, password: string): Promise<User> {
  const hashedPassword = await bcrypt.hash(password, 12)
  // ... SQLiteへの保存処理
}

// ログイン時のパスワード検証
export async function loginUser(email: string, password: string) {
  const user = await getUserByEmail(email)
  const isValid = await bcrypt.compare(password, user.password_hash)
  
  if (isValid) {
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      getJwtSecret(),
      { expiresIn: '7d' }
    )
    return { user, token }
  }
  
  return null
}
```

### データベース設計

```sql
-- ユーザーテーブル
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- プラットフォーム認証情報テーブル
CREATE TABLE platform_credentials (
  id TEXT PRIMARY KEY,
  platform_type TEXT NOT NULL UNIQUE,
  client_id TEXT,
  client_secret TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at DATETIME,
  is_active INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 音声ファイルテーブル
CREATE TABLE audio_files (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  duration INTEGER,
  status TEXT DEFAULT 'uploading',
  metadata TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 配信ジョブテーブル
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  audio_file_id TEXT NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  result_url TEXT,
  error_message TEXT,
  progress INTEGER DEFAULT 0,
  platform_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (audio_file_id) REFERENCES audio_files(id) ON DELETE CASCADE
);

-- アップロードファイルテーブル
CREATE TABLE uploads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  processed_file_path TEXT,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  status TEXT DEFAULT 'uploading',
  metadata TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- YouTube認証トークンテーブル
CREATE TABLE youtube_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT NOT NULL,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active',
  failure_count INTEGER DEFAULT 0,
  last_used_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id)
);
```

## 🔄 データフロー

### 1. 音声アップロードフロー

```typescript
// 音声アップロードの処理フロー
const uploadFlow = async (audioFile: File) => {
  // 1. ファイル検証
  const validation = await validateAudioFile(audioFile);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }
  
  // 2. ファイル保存
  const savedFile = await saveAudioFile(audioFile);
  
  // 3. 音声処理
  const processedAudio = await processAudio(savedFile);
  
  // 4. 文字起こし
  const transcript = await transcribeAudio(processedAudio);
  
  // 5. メタデータ保存
  const metadata = await saveMetadata({
    fileId: savedFile.id,
    transcript,
    duration: processedAudio.duration,
  });
  
  return { savedFile, processedAudio, transcript, metadata };
};
```

### 2. 配信フロー

```typescript
// 多プラットフォーム配信の処理フロー
const distributionFlow = async (audioFile: File, platforms: string[]) => {
  // 1. プラットフォーム認証情報の取得
  const credentials = await getPlatformCredentials(platforms);
  
  // 2. 並列配信処理
  const distributionPromises = platforms.map(async (platform) => {
    try {
      switch (platform) {
        case 'youtube':
          return await uploadToYouTube(audioFile, credentials.youtube);
        case 'voicy':
          return await uploadToVoicy(audioFile, credentials.voicy);
        case 'spotify':
          return await updateRSSFeed(audioFile);
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (error) {
      console.error(`${platform} upload failed:`, error);
      return { platform, success: false, error: error.message };
    }
  });
  
  // 3. 結果の収集
  const results = await Promise.allSettled(distributionPromises);
  
  // 4. ジョブステータスの更新
  await updateJobStatus(results);
  
  return results;
};
```

## 🎯 API設計

### RESTful APIエンドポイント

```typescript
// 認証関連
POST   /api/auth/login          # ログイン
POST   /api/auth/register       # ユーザー登録
GET    /api/auth/me             # ユーザー情報取得
GET    /api/auth/notifications  # 認証通知取得

// ファイル管理
POST   /api/uploads             # 音声ファイルアップロード
GET    /api/uploads/list        # ファイル一覧取得
GET    /api/uploads/lookup      # ファイル検索
POST   /api/uploads/trim        # 音声トリミング
POST   /api/uploads/transcribe  # 文字起こし

// プラットフォーム管理
GET    /api/platforms           # プラットフォーム一覧
POST   /api/platforms/voicy-credentials # Voicy認証情報保存
POST   /api/platforms/voicy-upload # Voicy配信
GET    /api/platforms/youtube/auth # YouTube認証開始
GET    /api/platforms/youtube/callback # YouTube認証コールバック
POST   /api/platforms/youtube/upload # YouTube配信
POST   /api/platforms/youtube/revoke # YouTube認証廃棄

// RSS Feed
GET    /api/rss                 # RSS Feed取得
GET    /api/rss/archive         # RSSアーカイブ
GET    /api/rss/info            # RSS情報
GET    /api/rss/stats           # RSS統計情報

// ジョブ管理
GET    /api/jobs                # ジョブ一覧取得
POST   /api/jobs                # ジョブ作成

// システム管理
GET    /api/health              # ヘルスチェック
POST   /api/init-db             # データベース初期化
GET    /api/stats               # システム統計
GET    /api/validate-rss        # RSS検証
```

### GraphQLスキーマ（将来の拡張）

```graphql
type User {
  id: ID!
  email: String!
  createdAt: DateTime!
  updatedAt: DateTime!
  audioFiles: [AudioFile!]!
  distributionJobs: [DistributionJob!]!
}

type AudioFile {
  id: ID!
  filename: String!
  originalName: String!
  fileSize: Int!
  duration: Float
  uploadedAt: DateTime!
  user: User!
  transcriptions: [Transcription!]!
}

type DistributionJob {
  id: ID!
  platform: String!
  status: JobStatus!
  metadata: JSON
  errorMessage: String
  createdAt: DateTime!
  updatedAt: DateTime!
  user: User!
  audioFile: AudioFile!
}

type Transcription {
  id: ID!
  transcript: String!
  language: String!
  createdAt: DateTime!
  audioFile: AudioFile!
}

enum JobStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

type Query {
  user: User
  audioFiles: [AudioFile!]!
  distributionJobs: [DistributionJob!]!
  rssFeed: String!
}

type Mutation {
  uploadAudioFile(file: Upload!): AudioFile!
  transcribeAudio(fileId: ID!): Transcription!
  distributeToPlatform(fileId: ID!, platform: String!): DistributionJob!
  updateJobStatus(jobId: ID!, status: JobStatus!): DistributionJob!
}
```

## 🔧 設定管理

### 環境変数管理

```typescript
// src/lib/env-config.ts
export const config = {
  // データベース設定
  database: {
    path: './blogpostplatform.db',
    type: 'sqlite',
  },
  
  // OpenAI設定
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'whisper-1',
    maxTokens: 2000,
  },
  
  // YouTube設定
  youtube: {
    clientId: process.env.YOUTUBE_CLIENT_ID!,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET!,
    apiKey: process.env.YOUTUBE_API_KEY!,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/platforms/youtube/callback`,
  },
  
  // Voicy設定
  voicy: {
    email: process.env.VOICY_EMAIL!,
    password: process.env.VOICY_PASSWORD!,
    browserlessApiKey: process.env.BROWSERLESS_API_KEY!,
  },
  
  // Browserless設定
  browserless: {
    apiKey: process.env.BROWSERLESS_API_KEY!,
    wsEndpoint: `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_API_KEY}`,
  },
  
  // ファイル設定
  file: {
    maxSize: 2 * 1024 * 1024 * 1024, // 2GB
    allowedTypes: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a', 'video/mp4', 'video/mov'],
    uploadDir: './uploads',
  },
  
  // 音声処理設定
  audio: {
    ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
    quality: process.env.AUDIO_QUALITY || '128k',
    format: process.env.AUDIO_FORMAT || 'mp3',
    silenceThreshold: process.env.SILENCE_THRESHOLD || '-50dB',
    silenceDuration: process.env.SILENCE_DURATION || '2.0',
  },
  
  // 認証設定
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-key-for-development-only',
    encryptionMasterKey: process.env.ENCRYPTION_MASTER_KEY!,
  },
};
```

## 📊 パフォーマンス最適化

### キャッシュ戦略

```typescript
// キャッシュ設定
const cacheConfig = {
  // SQLite WALモード（Write-Ahead Logging）
  sqlite: {
    journalMode: 'WAL',
    synchronous: 'NORMAL',
    cacheSize: 1000,
    tempStore: 'MEMORY',
  },
  
  // メモリキャッシュ
  memory: {
    maxSize: 100,
    ttl: 300, // 5分
  },
  
  // ファイルキャッシュ
  file: {
    uploadDir: './uploads',
    processingDir: './processing',
    cacheControl: 'public, max-age=3600',
  },
  
  // プラットフォーム設定キャッシュ
  platform: {
    configCacheTtl: 600, // 10分
    tokenCacheTtl: 1800, // 30分
  },
};
```

### データベース最適化

```sql
-- インデックス設定（SQLite）
CREATE INDEX IF NOT EXISTS idx_audio_files_user_id ON audio_files(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status);
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON uploads(created_at);
CREATE INDEX IF NOT EXISTS idx_youtube_tokens_user_id ON youtube_tokens(user_id);

-- SQLite固有の最適化
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 1000;
PRAGMA temp_store = MEMORY;
```

## 🔍 監視とログ

### ログ設定

```typescript
// src/lib/logger.ts
export class Logger {
  private static instance: Logger;
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  info(message: string, metadata?: any) {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, metadata);
  }
  
  error(message: string, error?: Error) {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error);
  }
  
  warn(message: string, metadata?: any) {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, metadata);
  }
}
```

### メトリクス収集

```typescript
// パフォーマンスメトリクス
const metrics = {
  // ファイルアップロード時間
  uploadTime: new Histogram({
    name: 'file_upload_duration_seconds',
    help: 'Duration of file uploads',
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  }),
  
  // 配信成功率
  distributionSuccess: new Counter({
    name: 'distribution_success_total',
    help: 'Total successful distributions',
    labelNames: ['platform'],
  }),
  
  // API応答時間
  apiResponseTime: new Histogram({
    name: 'api_response_time_seconds',
    help: 'API response time',
    labelNames: ['endpoint'],
  }),
};
```

## 🚀 デプロイメント

### Railway設定

```json
// railway.json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "NODE_OPTIONS='--max-old-space-size=768' npm start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 例外処理とメモリ管理

```typescript
// src/lib/voicyAutomation.ts
export async function processVoicyUpload(options: VoicyUploadOptions) {
  let browser: Browser | null = null
  let page: Page | null = null
  
  try {
    // メモリ使用量監視
    const startMemory = process.memoryUsage()
    console.log(`🚀 開始時メモリ使用量: ${Math.round(startMemory.heapUsed / 1024 / 1024)}MB`)
    
    // Playwrightブラウザー起動
    if (process.env.NODE_ENV === 'development') {
      browser = await chromium.launch({ headless: false })
    } else {
      browser = await chromium.connectOverCDT({
        wsEndpoint: process.env.BROWSERLESS_WS_ENDPOINT!,
      })
    }
    
    page = await browser.newPage()
    
    // アップロード処理実行
    await performVoicyUpload(page, options)
    
  } catch (error) {
    console.error('Voicyアップロードエラー:', error)
    throw error
  } finally {
    // リソースクリーンアップ
    if (page) {
      await page.close()
    }
    if (browser) {
      await browser.close()
    }
    
    // メモリ使用量最終確認
    const endMemory = process.memoryUsage()
    console.log(`📊 終了時メモリ使用量: ${Math.round(endMemory.heapUsed / 1024 / 1024)}MB`)
  }
}
```

### Docker設定（将来の拡張）

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

## 📞 サポート

システムアーキテクチャについて質問がある場合は、[GitHub Issues](https://github.com/yujiyamanaka/BlogPostPlatform/issues)でお問い合わせください。 