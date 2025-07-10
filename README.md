# BlogPostPlatform

音声コンテンツをYouTube、Voicy、Spotifyに自動配信するオープンソースシステム

## 🚀 概要

BlogPostPlatformは、音声コンテンツの前処理、文字起こし、要約生成から多プラットフォーム配信まで、一連のワークフローを自動化するシステムです。OpenAI Whisper APIとBrowserless.ioを活用し、効率的な音声コンテンツ配信を実現します。

## ✨ 主な機能

- **🎵 音声処理**: OpenAI Whisper APIによる高精度な文字起こしと要約生成
- **🎯 自動トリミング**: 無音部分の検出とキーフレーズベースの最適化トリミング
- **📺 多プラットフォーム配信**: YouTube、Voicy、Spotifyへの同時配信
- **🤖 ブラウザ自動化**: Browserless.io + PlaywrightによるVoicy自動化
- **📡 RSS Feed生成**: Spotify Podcast用の動的RSS Feed生成
- **🔒 セキュリティ**: AES-256-GCM暗号化による認証情報管理

## 🛠️ 技術スタック

### フロントエンド
- **Next.js 14** - React フレームワーク
- **React 18** - UI ライブラリ
- **TypeScript** - 型安全性
- **Tailwind CSS** - スタイリング
- **Shadcn/ui** - UI コンポーネント

### バックエンド
- **Next.js API Routes** - サーバーサイドAPI
- **Railway PostgreSQL** - データベース
- **OpenAI Whisper API** - 音声文字起こし
- **Browserless.io** - ブラウザ自動化
- **YouTube Data API v3** - YouTube配信

### セキュリティ
- **Clerk** - 認証・ユーザー管理
- **AES-256-GCM** - 認証情報暗号化
- **環境変数管理** - 機密情報保護

## 📚 ドキュメント

詳細なドキュメントは [docs/](./docs/) ディレクトリをご覧ください：

- [📖 ドキュメント概要](./docs/README.md)
- [⚙️ セットアップガイド](./docs/setup/)
- [🎯 プラットフォーム設定](./docs/platforms/)
- [🔧 機能詳細](./docs/features/)
- [👨‍💻 開発者ガイド](./docs/development/)
- [🐛 トラブルシューティング](./docs/troubleshooting/)

## 🚀 クイックスタート

### 1. リポジトリのクローン

```bash
git clone https://github.com/your-repo/BlogPostPlatform.git
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

必要な環境変数を設定してください：
- `OPENAI_API_KEY` - OpenAI API キー
- `BROWSERLESS_API_KEY` - Browserless.io API キー
- `DATABASE_URL` - PostgreSQL 接続URL
- `ENCRYPTION_KEY` - 32文字の暗号化キー

詳細は [環境変数設定ガイド](./docs/setup/environment-variables.md) を参照。

### 4. データベースの初期化

```bash
npm run db:init
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスしてください。

## 🎯 プラットフォーム設定

各プラットフォームの設定を行ってください：

- [YouTube設定](./docs/platforms/youtube.md) - YouTube Data API設定
- [Voicy設定](./docs/platforms/voicy.md) - Browserless.io自動化設定
- [Spotify設定](./docs/platforms/spotify.md) - RSS Feed設定

## 🔒 セキュリティ

### 認証情報の暗号化

すべてのプラットフォーム認証情報はAES-256-GCMで暗号化され、Railway PostgreSQLに安全に保存されます。

### 環境変数管理

機密情報は環境変数で管理され、Gitにコミットされることはありません。

### アクセス制御

Clerk認証により、ユーザーごとの適切なアクセス制御を実現しています。

## 🚀 デプロイ

Railwayでのデプロイを推奨しています：

```bash
# Railway CLIのインストール
npm install -g @railway/cli

# Railwayにログイン
railway login

# デプロイ
railway up
```

詳細は [デプロイ方法ガイド](./docs/setup/deployment.md) を参照してください。

## 🧪 テスト

```bash
# 単体テスト
npm run test

# E2Eテスト
npm run test:e2e

# 型チェック
npm run type-check
```

## 📊 パフォーマンス

- **音声処理**: FFmpeg.wasmによる効率的な音声処理
- **並列処理**: 複数ファイルの同時処理対応
- **キャッシュ**: 文字起こし結果のキャッシュ機能
- **CDN**: 静的アセットの最適化配信

## 🤝 コントリビューション

プロジェクトへの貢献を歓迎します！

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

詳細は [開発者ガイド](./docs/development/) を参照してください。

## 📄 ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

## 🆘 サポート

- [📖 ドキュメント](./docs/)
- [🐛 Issues](https://github.com/your-repo/BlogPostPlatform/issues)
- [💬 Discussions](https://github.com/your-repo/BlogPostPlatform/discussions)
- [📧 メール](mailto:support@blogpostplatform.com)

## 🙏 謝辞

- [OpenAI](https://openai.com/) - Whisper API
- [Browserless.io](https://browserless.io/) - ブラウザ自動化
- [Railway](https://railway.app/) - ホスティングプラットフォーム
- [Clerk](https://clerk.com/) - 認証システム

---

**⭐ このプロジェクトが役に立ったら、スターを付けてください！** 