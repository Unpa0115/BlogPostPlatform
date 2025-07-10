# 環境設定ガイド

BlogPostPlatformで必要な環境変数の詳細設定について説明します。

## 🔑 必須環境変数

### データベース設定

```bash
# Railway PostgreSQL URL
DATABASE_URL="postgresql://username:password@host:port/database"
```

### OpenAI API設定

```bash
# OpenAI APIキー（文字起こし・要約機能用）
OPENAI_API_KEY="sk-..."
```

### Browserless.io設定

```bash
# Browserless.io APIキー（Voicy自動化用）
BROWSERLESS_API_KEY="your-browserless-api-key"
```

### YouTube Data API設定

```bash
# YouTube Data API v3 クライアントID
YOUTUBE_CLIENT_ID="your-youtube-client-id.apps.googleusercontent.com"

# YouTube Data API v3 クライアントシークレット
YOUTUBE_CLIENT_SECRET="your-youtube-client-secret"
```

### 暗号化設定

```bash
# 32文字の暗号化キー（プラットフォーム認証情報の暗号化用）
ENCRYPTION_KEY="your-32-character-encryption-key-here"
```

## 🔧 オプション環境変数

### アプリケーション設定

```bash
# アプリケーションのベースURL
NEXT_PUBLIC_APP_URL="https://your-app.railway.app"

# 環境設定（development/production）
NODE_ENV="production"
```

### ファイルアップロード設定

```bash
# 最大ファイルサイズ（バイト）
MAX_FILE_SIZE="52428800"  # 50MB

# 許可される音声ファイル形式
ALLOWED_AUDIO_FORMATS="mp3,wav,m4a,ogg"
```

### RSS Feed設定

```bash
# RSS Feedのタイトル
RSS_FEED_TITLE="Your Podcast Title"

# RSS Feedの説明
RSS_FEED_DESCRIPTION="Your podcast description"
```

## 🛠️ 環境変数の取得方法

### OpenAI APIキー

1. [OpenAI Platform](https://platform.openai.com/)にアクセス
2. アカウントを作成またはログイン
3. API Keysセクションで新しいキーを生成
4. 生成されたキーをコピー

### Browserless.io APIキー

1. [Browserless.io](https://www.browserless.io/)にアクセス
2. アカウントを作成
3. API Keysセクションでキーを確認
4. キーをコピー

### YouTube Data API設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成
3. YouTube Data API v3を有効化
4. OAuth 2.0クライアントIDを作成
5. クライアントIDとシークレットをコピー

### Railway PostgreSQL設定

1. [Railway](https://railway.app/)にアクセス
2. 新しいプロジェクトを作成
3. PostgreSQLサービスを追加
4. 接続URLをコピー

## 🔐 セキュリティ注意事項

### 暗号化キーの生成

32文字の暗号化キーを生成するには：

```bash
# Node.jsを使用
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# または手動で32文字のランダム文字列を生成
```

### 環境変数の管理

- 本番環境では環境変数を直接設定
- 開発環境では`.env.local`ファイルを使用
- `.env.local`ファイルはGitにコミットしない
- 機密情報は適切に管理

## 🚀 Railwayでの環境変数設定

### Railway CLIを使用

```bash
# Railway CLIのインストール
npm install -g @railway/cli

# ログイン
railway login

# 環境変数の設定
railway variables set OPENAI_API_KEY="your-key"
railway variables set BROWSERLESS_API_KEY="your-key"
# 他の環境変数も同様に設定
```

### Railway Web UIを使用

1. Railwayプロジェクトにアクセス
2. Variablesタブを選択
3. 各環境変数を追加

## ✅ 設定確認

環境変数が正しく設定されているか確認：

```bash
# 開発環境
npm run dev

# 本番環境
npm run build
npm start
```

## 🐛 よくある問題

### 環境変数が読み込まれない

- `.env.local`ファイルが正しい場所にあるか確認
- ファイル名が正確か確認
- アプリケーションを再起動

### APIキーが無効

- APIキーが正しくコピーされているか確認
- プラットフォームでAPIキーが有効か確認
- 使用量制限に達していないか確認

## 📞 サポート

環境変数の設定で問題が発生した場合は、[GitHub Issues](https://github.com/yujiyamanaka/BlogPostPlatform/issues)でお問い合わせください。 