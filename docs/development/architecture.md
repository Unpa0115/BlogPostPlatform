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
│   (React)       │    │   (PostgreSQL)  │    │   Whisper API   │
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
  database: "Prisma 5.11.0 + PostgreSQL",
  authentication: "Clerk 6.12.9",
  encryption: "crypto-js + bcryptjs",
  fileProcessing: "Multer + Sharp",
};
```

### 外部サービス

```typescript
// 外部API
const externalServices = {
  openai: "Whisper API + GPT-4o-mini",
  youtube: "YouTube Data API v3",
  browserless: "Browserless.io",
  railway: "Railway PostgreSQL",
  spotify: "RSS Feed Generation",
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
// src/lib/encryption.ts
export class CredentialEncryption {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;
  
  constructor() {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey || encryptionKey.length !== 32) {
      throw new Error('Invalid encryption key');
    }
    this.key = Buffer.from(encryptionKey, 'hex');
  }
  
  encrypt(data: any): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.key);
    cipher.setAAD(Buffer.from('credentials'));
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      iv: iv.toString('hex'),
      encrypted,
      authTag: authTag.toString('hex'),
    });
  }
  
  decrypt(encryptedData: string): any {
    const { iv, encrypted, authTag } = JSON.parse(encryptedData);
    
    const decipher = crypto.createDecipher(this.algorithm, this.key);
    decipher.setAAD(Buffer.from('credentials'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }
}
```

### データベース設計

```sql
-- ユーザーテーブル
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- プラットフォーム認証情報テーブル
CREATE TABLE platform_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  encrypted_data TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, platform)
);

-- 音声ファイルテーブル
CREATE TABLE audio_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  duration FLOAT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 配信ジョブテーブル
CREATE TABLE distribution_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  audio_file_id UUID REFERENCES audio_files(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  metadata JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

// ファイル管理
POST   /api/uploads             # 音声ファイルアップロード
GET    /api/uploads/list        # ファイル一覧取得
POST   /api/uploads/trim        # 音声トリミング
POST   /api/uploads/transcribe  # 文字起こし

// プラットフォーム管理
GET    /api/platforms           # プラットフォーム一覧
POST   /api/platforms/credentials # 認証情報保存
GET    /api/platforms/voicy-upload # Voicy配信
POST   /api/platforms/youtube/upload # YouTube配信

// RSS Feed
GET    /api/rss                 # RSS Feed取得
POST   /api/rss/episodes        # エピソード追加
GET    /api/rss/stats           # RSS統計情報

// ジョブ管理
GET    /api/jobs                # ジョブ一覧取得
POST   /api/jobs                # ジョブ作成
PUT    /api/jobs/:id            # ジョブ更新
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
// src/lib/config.ts
export const config = {
  // データベース設定
  database: {
    url: process.env.DATABASE_URL!,
    ssl: process.env.NODE_ENV === 'production',
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
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/platforms/youtube/callback`,
  },
  
  // Browserless設定
  browserless: {
    apiKey: process.env.BROWSERLESS_API_KEY!,
    wsEndpoint: `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_API_KEY}`,
  },
  
  // ファイル設定
  file: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['audio/mpeg', 'audio/wav', 'audio/mp4'],
    uploadDir: './uploads',
  },
  
  // 暗号化設定
  encryption: {
    algorithm: 'aes-256-gcm',
    key: process.env.ENCRYPTION_KEY!,
  },
};
```

## 📊 パフォーマンス最適化

### キャッシュ戦略

```typescript
// キャッシュ設定
const cacheConfig = {
  // Redis設定（将来の拡張）
  redis: {
    url: process.env.REDIS_URL,
    ttl: 3600, // 1時間
  },
  
  // メモリキャッシュ
  memory: {
    maxSize: 100,
    ttl: 300, // 5分
  },
  
  // CDN設定
  cdn: {
    domain: process.env.CDN_DOMAIN,
    cacheControl: 'public, max-age=3600',
  },
};
```

### データベース最適化

```sql
-- インデックス設定
CREATE INDEX idx_audio_files_user_id ON audio_files(user_id);
CREATE INDEX idx_distribution_jobs_user_id ON distribution_jobs(user_id);
CREATE INDEX idx_distribution_jobs_status ON distribution_jobs(status);
CREATE INDEX idx_platform_credentials_user_platform ON platform_credentials(user_id, platform);

-- パーティショニング（将来の拡張）
CREATE TABLE audio_files_partitioned (
  LIKE audio_files INCLUDING ALL
) PARTITION BY RANGE (uploaded_at);

CREATE TABLE audio_files_2024 PARTITION OF audio_files_partitioned
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
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
    "startCommand": "npm start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
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