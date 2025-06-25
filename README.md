# BlogPostPlatform

音声取得、自動トリミング、複数配信プラットフォームへの自動アップロード機能を持つブログ投稿プラットフォーム

## 機能

- 🎵 音声ファイルのアップロード・管理（Railway Storage）
- ✂️ Whisper APIを使用した自動音声トリミング
- 📤 複数プラットフォームへの自動配信（Voicy、YouTube、Spotify）
- 🔌 プラグイン方式での機能拡張
- 📊 ジョブ管理・ステータス追跡
- 🔐 JWT認証システム

## 技術スタック

- **フロントエンド**: Next.js 14, React 18, TypeScript
- **スタイリング**: Tailwind CSS
- **データベース**: Railway PostgreSQL
- **認証**: JWT + bcryptjs
- **ストレージ**: Railway Storage
- **音声処理**: OpenAI Whisper API
- **自動化**: Browserless.io (Playwright)
- **配信API**: YouTube Data API

## セットアップ

### 前提条件

- Node.js 18以上
- npm または yarn
- Railwayアカウント
- OpenAI APIキー
- Browserless.io APIキー

### インストール

1. リポジトリをクローン
```bash
git clone <repository-url>
cd BlogPostPlatform
```

2. 依存関係をインストール
```bash
npm install
```

3. 環境変数を設定
```bash
cp env.example .env.local
```

4. `.env.local`ファイルを編集して必要なAPIキーを設定

5. Railwayプロジェクトを設定
   - Railwayでプロジェクトを作成
   - PostgreSQLデータベースを追加
   - Storageバケットを作成
   - 環境変数を設定

6. データベースを初期化
```bash
npm run db:init
```

7. 開発サーバーを起動
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

### Railway

1. Railwayにプロジェクトを接続
2. 環境変数を設定
3. PostgreSQLデータベースを追加
4. Storageバケットを作成
5. 自動デプロイが有効

### Vercel

1. Vercelにプロジェクトを接続
2. 環境変数を設定
3. Railwayとの連携設定

## ライセンス

MIT License

## 貢献

プルリクエストやイシューの報告を歓迎します。 