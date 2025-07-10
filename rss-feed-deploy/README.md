# RSS Feed Deploy

BlogPostPlatform用のRSSフィード専用デプロイ環境です。

## 概要

このディレクトリは、RSSフィード（Spotify Podcast用）をRailwayで静的ホスティングするための専用環境です。

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/yujiyamanaka/BlogPostPlatform.git
cd BlogPostPlatform/rss-feed-deploy
```

### 2. Railwayでのデプロイ

1. [Railway](https://railway.app/)にログイン
2. "New Project" → "Deploy from GitHub repo"
3. リポジトリを選択
4. デプロイ完了後、提供されるURLをメモ

### 3. 環境変数の設定（Railway）

Railwayのプロジェクト設定で以下の環境変数を設定：

```bash
NODE_ENV=production
```

## 使用方法

### RSSフィードのURL

**現在のRSS Feedは、メインアプリケーションのAPIエンドポイントで提供されています：**

- `https://{your-railway-app-name}.up.railway.app/api/rss`

**例：**
- `https://blogpostplatform-production.up.railway.app/api/rss`

### 静的ホスティング（将来のオプション）

専用の静的ホスティングが必要な場合、以下のURLでRSSフィードにアクセスできます：

- `https://your-railway-app.railway.app/feed.xml`
- `https://your-railway-app.railway.app/` (ルートでも同じファイル)

### 自動更新

RSSフィードは、メインアプリで投稿ボタンを押すと自動的に更新されます。

## ファイル構成

```
rss-feed-deploy/
├── feed.xml             # 生成されたRSSフィード
├── railway.json          # Railway設定
├── package.json          # 依存関係
└── README.md            # このファイル
```

## 技術仕様

- **ホスティング**: Railway Static Site（専用デプロイ時）
- **API エンドポイント**: Next.js API Routes（現在使用中）
- **ファイル形式**: XML (RSS 2.0)
- **キャッシュ**: 5分間
- **文字エンコーディング**: UTF-8

## トラブルシューティング

### RSSフィードが更新されない場合

1. メインアプリの投稿処理が正常に完了しているか確認
2. Railwayのログでエラーがないか確認
3. ファイルパーミッションを確認

### アクセスできない場合

1. Railwayのデプロイが正常に完了しているか確認
2. 環境変数が正しく設定されているか確認
3. カスタムドメインの設定を確認
4. **API エンドポイント**: `/api/rss` が正しく動作しているか確認

### 404エラーが発生する場合

- 静的ファイル（`/feed.xml`）へのアクセスは現在サポートされていません
- 代わりに `/api/rss` エンドポイントを使用してください

## ライセンス

MIT License

## サポート

問題が発生した場合は、GitHubのIssuesで報告してください。 