# デプロイ方法ガイド

## 概要

BlogPostPlatformはRailwayプラットフォームでのデプロイを推奨しています。このガイドでは、Railwayへのデプロイ手順と設定方法を説明します。

## 前提条件

- Railwayアカウント
- GitHubリポジトリ
- 環境変数の設定完了
- プラットフォーム設定の完了

## 1. Railwayプロジェクトの作成

### Railway CLIを使用する場合

```bash
# Railway CLIのインストール
npm install -g @railway/cli

# Railwayにログイン
railway login

# 新しいプロジェクトを作成
railway init

# プロジェクトをリンク
railway link
```

### Railway Web UIを使用する場合

1. [Railway Dashboard](https://railway.app/dashboard)にアクセス
2. "New Project"をクリック
3. "Deploy from GitHub repo"を選択
4. GitHubリポジトリを選択

## 2. データベースの設定

### PostgreSQLの追加

```bash
# Railway CLIでPostgreSQLを追加
railway add

# またはWeb UIで"New Service" → "Database" → "PostgreSQL"を選択
```

### データベース接続情報の取得

```bash
# データベースURLを取得
railway variables

# またはWeb UIで"Variables"タブを確認
```

## 3. 環境変数の設定

### Railway CLIを使用する場合

```bash
# 環境変数を設定
railway variables set NODE_ENV=production
railway variables set NEXT_PUBLIC_APP_URL=https://your-app.railway.app
railway variables set DATABASE_URL=postgresql://username:password@host:port/database
railway variables set ENCRYPTION_KEY=your-32-character-encryption-key
railway variables set OPENAI_API_KEY=sk-your-openai-api-key
railway variables set BROWSERLESS_API_KEY=your-browserless-api-key
railway variables set YOUTUBE_CLIENT_ID=your-youtube-client-id
railway variables set YOUTUBE_CLIENT_SECRET=your-youtube-client-secret
railway variables set YOUTUBE_REDIRECT_URI=https://your-app.railway.app/api/platforms/youtube/callback
railway variables set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your-clerk-key
railway variables set CLERK_SECRET_KEY=sk_live_your-clerk-secret
```

### Railway Web UIを使用する場合

1. プロジェクトの"Variables"タブに移動
2. 以下の環境変数を追加：

```bash
# 基本設定
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.railway.app

# データベース
DATABASE_URL=postgresql://username:password@host:port/database

# 暗号化
ENCRYPTION_KEY=your-32-character-encryption-key

# API設定
OPENAI_API_KEY=sk-your-openai-api-key
BROWSERLESS_API_KEY=your-browserless-api-key

# YouTube設定
YOUTUBE_CLIENT_ID=your-youtube-client-id
YOUTUBE_CLIENT_SECRET=your-youtube-client-secret
YOUTUBE_REDIRECT_URI=https://your-app.railway.app/api/platforms/youtube/callback

# Clerk設定
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your-clerk-key
CLERK_SECRET_KEY=sk_live_your-clerk-secret

# セキュリティ設定
SESSION_SECRET=your-production-session-secret
CORS_ORIGIN=https://your-app.railway.app

# パフォーマンス設定
CACHE_TTL=3600
MAX_FILE_SIZE=100000000
```

## 4. デプロイ設定

### package.jsonの確認

```json
{
  "scripts": {
    "build": "next build",
    "start": "next start",
    "dev": "next dev"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### railway.jsonの設定（オプション）

```json
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

## 5. デプロイの実行

### 自動デプロイ（推奨）

```bash
# GitHubにプッシュすると自動デプロイ
git add .
git commit -m "Deploy to Railway"
git push origin main
```

### 手動デプロイ

```bash
# Railway CLIでデプロイ
railway up

# またはWeb UIで"Deploy"ボタンをクリック
```

## 6. デプロイ後の確認

### ヘルスチェック

```bash
# アプリケーションの動作確認
curl https://your-app.railway.app/api/health

# またはブラウザでアクセス
open https://your-app.railway.app
```

### ログの確認

```bash
# Railway CLIでログを確認
railway logs

# またはWeb UIで"Logs"タブを確認
```

### 環境変数の確認

```bash
# 環境変数の設定状況を確認
railway variables

# またはWeb UIで"Variables"タブを確認
```

## 7. カスタムドメインの設定

### ドメインの追加

```bash
# Railway CLIでドメインを追加
railway domain

# またはWeb UIで"Settings" → "Domains"を確認
```

### DNS設定

1. ドメインプロバイダーでDNSレコードを設定
2. CNAMEレコードをRailwayのドメインに設定
3. SSL証明書の自動発行を確認

## 8. 監視とメンテナンス

### メトリクスの確認

```bash
# Railway CLIでメトリクスを確認
railway status

# またはWeb UIで"Metrics"タブを確認
```

### ログの監視

```bash
# リアルタイムログの確認
railway logs --follow

# エラーログの確認
railway logs --error
```

### バックアップの設定

```bash
# データベースのバックアップ設定
railway backup

# またはWeb UIで"Backups"タブを確認
```

## トラブルシューティング

### よくある問題

1. **ビルドエラー**
   ```bash
   # ローカルでビルドテスト
   npm run build
   
   # ログを確認
   railway logs
   ```

2. **環境変数エラー**
   ```bash
   # 環境変数を確認
   railway variables
   
   # 必須環境変数が設定されているか確認
   ```

3. **データベース接続エラー**
   ```bash
   # データベース接続を確認
   railway connect
   
   # マイグレーションを実行
   npm run db:migrate
   ```

4. **メモリ不足エラー**
   ```bash
   # Railway Web UIで"Settings" → "Resources"を確認
   # メモリ制限を増やす
   ```

### デバッグ方法

```bash
# 詳細なログを確認
railway logs --debug

# 特定のサービスに接続
railway connect

# 環境変数を確認
railway variables
```

## パフォーマンス最適化

### 1. ビルド最適化

```bash
# 本番ビルドの最適化
NODE_ENV=production npm run build

# 静的ファイルの最適化
npm run export
```

### 2. キャッシュ設定

```bash
# キャッシュの設定
railway variables set CACHE_TTL=3600

# CDNの設定
railway variables set ENABLE_CDN=true
```

### 3. スケーリング

```bash
# インスタンス数の調整
railway scale 2

# またはWeb UIで"Settings" → "Scaling"を確認
```

## セキュリティ設定

### 1. HTTPS強制

```bash
# HTTPSリダイレクトの設定
railway variables set FORCE_HTTPS=true
```

### 2. セキュリティヘッダー

```bash
# セキュリティヘッダーの設定
railway variables set ENABLE_SECURITY_HEADERS=true
```

### 3. レート制限

```bash
# レート制限の設定
railway variables set RATE_LIMIT_ENABLED=true
railway variables set RATE_LIMIT_MAX_REQUESTS=100
```

## 次のステップ

1. [プラットフォーム設定](../platforms/)を完了
2. [トラブルシューティング](../troubleshooting/)を参照
3. [開発者ガイド](../development/)を確認 