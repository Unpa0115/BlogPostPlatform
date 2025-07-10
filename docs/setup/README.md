# セットアップガイド

BlogPostPlatformの初期セットアップ手順を説明します。

## 📋 前提条件

- Node.js 18.0.0以上
- npm または yarn
- Git
- Railwayアカウント（デプロイ用）
- 各プラットフォームのAPIキー（後述）

## 🚀 クイックスタート

### 1. リポジトリのクローン

```bash
git clone https://github.com/yujiyamanaka/BlogPostPlatform.git
cd BlogPostPlatform
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

```bash
cp env.example .env.local
```

`.env.local`ファイルを編集して必要な環境変数を設定してください：

```bash
# データベース
DATABASE_URL="your-database-url"

# OpenAI API
OPENAI_API_KEY="your-openai-api-key"

# Browserless.io
BROWSERLESS_API_KEY="your-browserless-api-key"

# YouTube Data API
YOUTUBE_CLIENT_ID="your-youtube-client-id"
YOUTUBE_CLIENT_SECRET="your-youtube-client-secret"

# 暗号化キー
ENCRYPTION_KEY="your-32-character-encryption-key"
```

### 4. データベースの初期化

```bash
npm run db:init
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスしてアプリケーションを確認してください。

## 🔧 詳細設定

### 環境変数の詳細設定

詳細な環境変数設定については[環境設定ガイド](./environment.md)を参照してください。

### プラットフォーム設定

各プラットフォームの設定については以下のガイドを参照してください：

- [YouTube設定](../platforms/youtube.md)
- [Voicy設定](../platforms/voicy.md)
- [Spotify設定](../platforms/spotify.md)

## 🚀 デプロイ

Railwayへのデプロイについては[デプロイメントガイド](./deployment.md)を参照してください。

## ✅ 動作確認

セットアップ完了後、以下の機能が正常に動作することを確認してください：

1. **音声アップロード**: 音声ファイルのアップロード機能
2. **前処理**: 音声の自動トリミング機能
3. **文字起こし**: OpenAI Whisper APIによる文字起こし
4. **配信**: 各プラットフォームへの配信機能

## 🐛 トラブルシューティング

問題が発生した場合は[トラブルシューティングガイド](../troubleshooting/common-issues.md)を参照してください。

## 📞 サポート

追加のサポートが必要な場合は、[GitHub Issues](https://github.com/yujiyamanaka/BlogPostPlatform/issues)でお問い合わせください。 