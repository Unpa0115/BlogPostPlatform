# BlogPostPlatform ドキュメント

## 概要

BlogPostPlatformは、音声コンテンツをYouTube、Voicy、Spotifyに自動配信するオープンソースシステムです。音声ファイルの前処理、文字起こし、要約生成から配信まで、一連のワークフローを自動化します。

## システム特徴

- **多プラットフォーム配信**: YouTube、Voicy、Spotifyへの同時配信
- **音声処理**: OpenAI Whisper APIによる文字起こしと要約生成
- **自動化**: Browserless.io + Playwrightによるブラウザ操作自動化
- **セキュリティ**: AES-256-GCM暗号化による認証情報管理
- **スケーラビリティ**: Railway PostgreSQL + Next.jsによる高可用性

## ドキュメント構成

### 📚 セットアップガイド
- [初期セットアップ](./setup/initial-setup.md) - プロジェクトの初期設定
- [環境変数設定](./setup/environment-variables.md) - 必要な環境変数の設定
- [デプロイ方法](./setup/deployment.md) - Railwayへのデプロイ手順

### 🎯 プラットフォーム設定
- [YouTube設定](./platforms/youtube.md) - YouTube Data API設定とアップロード
- [Voicy設定](./platforms/voicy.md) - Voicyブラウザ自動化設定
- [Spotify設定](./platforms/spotify.md) - Spotify RSS Feed設定

### ⚙️ 機能詳細
- [音声処理](./features/audio-processing.md) - 前処理、トリミング、文字起こし
- [配信機能](./features/distribution.md) - 多プラットフォーム配信の仕組み
- [RSS Feed](./features/rss-feed.md) - Spotify用RSS Feed生成

### 👨‍💻 開発者向け
- [アーキテクチャ](./development/architecture.md) - システム設計と技術スタック
- [API設計](./development/api-design.md) - RESTful API設計
- [セキュリティ](./development/security.md) - 認証・暗号化・セキュリティ設計
- [パフォーマンス](./development/performance.md) - 最適化とスケーリング

### 🔧 トラブルシューティング
- [よくある問題](./troubleshooting/common-issues.md) - 環境変数、認証、音声処理エラー
- [デバッグ方法](./troubleshooting/debugging.md) - ログ確認、エラー解析
- [デプロイエラー](./troubleshooting/deployment-errors.md) - Railwayデプロイ時の問題

## クイックスタート

1. [初期セットアップ](./setup/initial-setup.md)を実行
2. [環境変数](./setup/environment-variables.md)を設定
3. [プラットフォーム設定](./platforms/)を完了
4. [デプロイ](./setup/deployment.md)を実行

## 技術スタック

- **フロントエンド**: Next.js 14, React 18, TypeScript
- **バックエンド**: Next.js API Routes, Railway Functions
- **データベース**: Railway PostgreSQL
- **音声処理**: OpenAI Whisper API, Web Audio API
- **自動化**: Browserless.io, Playwright
- **配信API**: YouTube Data API v3, RSS Feed
- **セキュリティ**: AES-256-GCM暗号化, Clerk認証

## ライセンス

MIT License - 詳細は[LICENSE](../LICENSE)を参照

## コントリビューション

プロジェクトへの貢献を歓迎します。詳細は[CONTRIBUTING.md](../CONTRIBUTING.md)を参照してください。

## サポート

- [Issues](https://github.com/your-repo/BlogPostPlatform/issues) - バグ報告・機能要望
- [Discussions](https://github.com/your-repo/BlogPostPlatform/discussions) - 質問・議論
- [Wiki](https://github.com/your-repo/BlogPostPlatform/wiki) - 追加ドキュメント 