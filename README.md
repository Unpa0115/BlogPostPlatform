# BlogPostPlatform

音声取得、自動トリミング、複数配信プラットフォームへの自動アップロード機能を持つブログ投稿プラットフォーム

## セキュリティ機能

### Credentials暗号化
- すべてのプラットフォーム認証情報はAES-256-GCMで暗号化
- 環境変数`ENCRYPTION_MASTER_KEY`で管理
- データベースには暗号化された状態で保存
- 復号化はアプリケーション実行時のみ

### 認証・認可
- JWTベースの認証システム
- ユーザーごとの認証情報分離
- APIエンドポイントの認証保護

## 機能

- 🎵 音声ファイルのアップロード・管理（Railway Storage）
- ✂️ Whisper APIを使用した自動音声トリミング
- 📤 複数プラットフォームへの自動配信（Voicy、YouTube、Spotify）
- 🔌 プラグイン方式での機能拡張
- 📊 ジョブ管理・ステータス追跡
- 🔐 JWT認証システム

## 技術スタック

- **フロントエンド**: Next.js 14, React 18, TypeScript
- **スタイリング**: Tailwind CSS, shadcn/ui
- **データベース**: Railway PostgreSQL
- **認証**: JWT + bcryptjs
- **ストレージ**: Railway Storage
- **暗号化**: AES-256-GCM
- **音声処理**: OpenAI Whisper API
- **自動化**: Browserless.io (Playwright)
- **配信API**: YouTube Data API

## セットアップ

### 1. 環境変数の設定

```bash
cp env.example .env.local
```

必須の環境変数：
- `DATABASE_URL`: Railway PostgreSQL接続URL
- `JWT_SECRET`: JWT署名用シークレット
- `ENCRYPTION_MASTER_KEY`: Credentials暗号化用マスターキー（32文字以上推奨）

### RSS Feed環境別設定

localhost環境でGitHub PagesのRSS Feedを使用する場合：
```bash
LOCALHOST_RSS_ENABLED=true
GITHUB_PAGES_URL=https://your-username.github.io/your-repo-name
```

通常のlocalhost環境（従来通り）：
```bash
LOCALHOST_RSS_ENABLED=false
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. データベース初期化

```bash
npm run db:init
```

### 4. 開発サーバー起動

```bash
npm run dev
```

## プロジェクト構造

```
src/
├── app/                 # Next.js App Router
│   ├── layout.tsx      # ルートレイアウト
│   ├── page.tsx        # ホームページ
│   └── globals.css     # グローバルスタイル
├── components/         # Reactコンポーネント
├── lib/               # ライブラリ設定
│   ├── railway.ts     # Railway PostgreSQL/Storage
│   ├── auth.ts        # JWT認証システム
│   └── database.ts    # データベース初期化
├── types/             # TypeScript型定義
├── hooks/             # カスタムフック
├── utils/             # ユーティリティ関数
└── contexts/          # Reactコンテキスト
```

## データベーススキーマ

### users
- id (UUID, Primary Key)
- email (VARCHAR, Unique)
- password_hash (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### audio_files
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- file_name (VARCHAR)
- file_url (TEXT)
- file_size (BIGINT)
- duration (INTEGER)
- status (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### jobs
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- audio_file_id (UUID, Foreign Key)
- job_type (VARCHAR)
- status (VARCHAR)
- result_url (TEXT)
- error_message (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### distribution_platforms
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- platform_type (VARCHAR)
- platform_name (VARCHAR)
- credentials (JSONB)
- enabled (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

## 開発

### 利用可能なスクリプト

- `npm run dev` - 開発サーバー起動
- `npm run build` - プロダクションビルド
- `npm run start` - プロダクションサーバー起動
- `npm run lint` - ESLint実行
- `npm run type-check` - TypeScript型チェック
- `npm run db:init` - データベース初期化

### コーディング規約

- TypeScriptの厳格モードを使用
- ESLint + Prettierでコードフォーマット
- コンポーネントは関数型コンポーネント
- Server Componentsを優先使用
- Railwayベースの一貫したアーキテクチャを維持

## デプロイ

Railwayでの自動デプロイに対応しています。

1. GitHubリポジトリをRailwayに接続
2. 環境変数を設定
3. 自動デプロイ開始

## 注意事項

- `ENCRYPTION_MASTER_KEY`は絶対に漏洩させないでください
- 本番環境では強力なマスターキーを使用してください
- 定期的なセキュリティ監査を推奨します

## ライセンス

MIT License

## 貢献

プルリクエストやイシューの報告を歓迎します。 