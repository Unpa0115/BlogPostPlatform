# 環境変数設定ガイド

## 概要

BlogPostPlatformでは、セキュリティと機能性を確保するため、多くの環境変数を使用します。このガイドでは、必要な環境変数とその設定方法を説明します。

## 必須環境変数

### 基本設定

```bash
# アプリケーション設定
NODE_ENV=development  # development, production, test
NEXT_PUBLIC_APP_URL=http://localhost:3000  # 本番環境では実際のURL

# データベース設定
DATABASE_URL=postgresql://username:password@host:port/database

# 暗号化キー（32文字のランダム文字列）
ENCRYPTION_KEY=your-32-character-encryption-key-here
```

### OpenAI API設定

```bash
# OpenAI API設定
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_ORGANIZATION=org-your-organization-id  # オプション
```

### Browserless.io設定

```bash
# Browserless.io設定（Voicy自動化用）
BROWSERLESS_API_KEY=your-browserless-api-key-here
```

### YouTube API設定

```bash
# YouTube Data API設定
YOUTUBE_CLIENT_ID=your-youtube-client-id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your-youtube-client-secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/platforms/youtube/callback
```

### Clerk認証設定

```bash
# Clerk認証設定
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your-clerk-publishable-key
CLERK_SECRET_KEY=sk_test_your-clerk-secret-key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

## オプション環境変数

### 開発・デバッグ用

```bash
# デバッグ設定
DEBUG=*  # すべてのデバッグログを有効化
LOG_LEVEL=debug  # ログレベル設定

# 開発用設定
NEXT_PUBLIC_ENABLE_MOCK_DATA=true  # モックデータを有効化
NEXT_PUBLIC_ENABLE_DEBUG_PANEL=true  # デバッグパネルを有効化
```

### パフォーマンス設定

```bash
# キャッシュ設定
CACHE_TTL=3600  # キャッシュ有効期限（秒）
MAX_FILE_SIZE=100000000  # 最大ファイルサイズ（バイト）

# 音声処理設定
AUDIO_MAX_DURATION=3600  # 最大音声長（秒）
AUDIO_SAMPLE_RATE=44100  # サンプリングレート
```

### セキュリティ設定

```bash
# セキュリティ設定
SESSION_SECRET=your-session-secret-key
CORS_ORIGIN=http://localhost:3000  # 本番環境では実際のドメイン

# レート制限設定
RATE_LIMIT_WINDOW=900000  # 15分
RATE_LIMIT_MAX_REQUESTS=100  # 最大リクエスト数
```

## 環境別設定例

### 開発環境 (.env.local)

```bash
# 開発環境設定
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# データベース（ローカルSQLite）
DATABASE_URL=file:./dev.db

# 暗号化キー（開発用）
ENCRYPTION_KEY=dev-32-character-encryption-key

# API設定
OPENAI_API_KEY=sk-your-openai-api-key
BROWSERLESS_API_KEY=your-browserless-api-key

# Clerk設定（開発用）
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_development-key
CLERK_SECRET_KEY=sk_test_development-secret

# デバッグ設定
DEBUG=*
LOG_LEVEL=debug
NEXT_PUBLIC_ENABLE_DEBUG_PANEL=true
```

### 本番環境 (Railway)

```bash
# 本番環境設定
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.railway.app

# データベース（Railway PostgreSQL）
DATABASE_URL=postgresql://username:password@host:port/database

# 暗号化キー（本番用）
ENCRYPTION_KEY=prod-32-character-encryption-key

# API設定
OPENAI_API_KEY=sk-your-openai-api-key
BROWSERLESS_API_KEY=your-browserless-api-key

# Clerk設定（本番用）
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_production-key
CLERK_SECRET_KEY=sk_live_production-secret

# セキュリティ設定
SESSION_SECRET=your-production-session-secret
CORS_ORIGIN=https://your-app.railway.app

# パフォーマンス設定
CACHE_TTL=3600
MAX_FILE_SIZE=100000000
```

## 環境変数の生成方法

### 暗号化キーの生成

```bash
# Node.jsで32文字のランダムキーを生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### セッションシークレットの生成

```bash
# セッションシークレットを生成
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 環境変数の検証

### 設定確認スクリプト

```bash
# 環境変数の設定状況を確認
npm run verify:env
```

### 手動確認

```bash
# 必須環境変数の確認
echo "NODE_ENV: $NODE_ENV"
echo "DATABASE_URL: $DATABASE_URL"
echo "OPENAI_API_KEY: ${OPENAI_API_KEY:0:10}..."
echo "BROWSERLESS_API_KEY: ${BROWSERLESS_API_KEY:0:10}..."
```

## セキュリティベストプラクティス

### 1. 機密情報の管理

- 環境変数は`.env.local`ファイルに保存（Gitにコミットしない）
- 本番環境ではRailwayの環境変数機能を使用
- 暗号化キーは定期的にローテーション

### 2. アクセス制御

```bash
# .env.localファイルの権限設定
chmod 600 .env.local
```

### 3. 環境変数の暗号化

```bash
# 本番環境では環境変数を暗号化して保存
npm run encrypt:env
```

## トラブルシューティング

### よくある問題

1. **環境変数が読み込まれない**
   ```bash
   # アプリケーションを再起動
   npm run dev
   ```

2. **暗号化キーエラー**
   ```bash
   # 暗号化キーの長さを確認
   echo $ENCRYPTION_KEY | wc -c
   # 33文字（32文字 + 改行）である必要があります
   ```

3. **APIキーエラー**
   ```bash
   # APIキーの形式を確認
   echo $OPENAI_API_KEY | grep -E "^sk-[a-zA-Z0-9]{48}$"
   ```

### デバッグ方法

```bash
# 環境変数の詳細確認
npm run debug:env

# 特定の環境変数を確認
node -e "console.log(process.env.OPENAI_API_KEY)"
```

## 次のステップ

1. [初期セットアップ](./initial-setup.md)を完了
2. [プラットフォーム設定](../platforms/)を実行
3. [デプロイ方法](./deployment.md)を確認 