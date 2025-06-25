# BlogPostPlatform タスク管理

## プロジェクト概要
音声取得、自動トリミング、複数配信プラットフォームへの自動アップロード機能を持つブログ投稿プラットフォーム

## 実装タスク

### 🔴 緊急 - プロジェクト基盤構築
- [x] プロジェクト初期設定の完了
  - package.json、tsconfig.json、next.config.ts等の設定
  - 依存関係のインストール
  - 見積時間: 30分

- [x] ディレクトリ構造の作成
  - src/app、src/components、src/lib等の基本構造
  - 見積時間: 15分

- [x] Railwayベースへの再設計
  - SupabaseからRailwayへの移行
  - Railway PostgreSQL、Auth、Storage設定
  - 見積時間: 1時間

- [ ] Railwayプロジェクト設定
  - Railwayプロジェクト作成
  - 環境変数設定
  - データベース初期化
  - 見積時間: 45分

### 🟡 重要 - 認証・ユーザー管理
- [ ] Railway認証システムの実装
  - JWT認証システム
  - ログイン・サインアップ機能
  - 認証状態管理
  - 見積時間: 2時間

- [ ] ユーザープロフィール管理
  - プロフィール編集機能
  - 見積時間: 1時間

### 🟡 重要 - 音声管理機能
- [ ] 音声ファイルアップロード機能
  - Railway Storage連携
  - ドラッグ&ドロップ対応
  - ファイル形式検証
  - 見積時間: 2時間

- [ ] 音声プレビュー機能
  - Web Audio APIを使用した再生機能
  - 見積時間: 1.5時間

- [ ] 音声ファイル管理UI
  - ファイル一覧表示
  - 削除・編集機能
  - 見積時間: 1.5時間

### 🟢 通常 - 自動トリミング機能
- [ ] Whisper API連携
  - 音声解析機能
  - キーフレーズ検出
  - 見積時間: 3時間

- [ ] 自動トリミングUI
  - トリミング設定画面
  - プレビュー機能
  - 見積時間: 2時間

### 🟢 通常 - 配信プラットフォーム連携
- [ ] Browserless.io連携
  - Voicy自動アップロード機能
  - 見積時間: 4時間

- [ ] YouTube Data API連携
  - YouTube動画アップロード機能
  - 見積時間: 3時間

- [ ] RSS Feed生成機能
  - Spotify配信用RSS生成
  - 見積時間: 1.5時間

### 🟢 通常 - ジョブ管理システム
- [x] ジョブ管理データベース設計
  - jobs、distribution_platformsテーブル
  - 見積時間: 1時間

- [ ] ジョブ管理UI
  - ジョブ一覧表示
  - ステータス管理
  - 見積時間: 2時間

- [ ] Webhook受信機能
  - 外部サービスからの通知受信
  - 見積時間: 1.5時間

### ⚪ 低優先 - プラグインシステム
- [ ] 文字起こしプラグイン
  - OpenAI Whisper API連携
  - 見積時間: 2時間

- [ ] 要約プラグイン
  - GPT-4o-mini連携
  - 見積時間: 2時間

- [ ] 記事生成プラグイン
  - 自動記事生成機能
  - 見積時間: 3時間

### ⚪ 低優先 - 追加機能
- [ ] PWA対応
  - Service Worker実装
  - オフライン対応
  - 見積時間: 2時間

- [ ] ダッシュボード機能
  - 統計情報表示
  - KPI可視化
  - 見積時間: 3時間

## 現在の進捗状況
- [x] Railwayベース再設計完了
  - package.jsonをRailway用に更新
  - Railway PostgreSQL、Auth、Storage設定完了
  - データベーススキーマ設計完了
  - 次: Railwayプロジェクト設定と依存関係インストール

## 次のアクション
1. 新しい依存関係のインストール（npm install）
2. Railwayプロジェクトの設定
3. データベース初期化
4. 基本認証機能の実装

## 完了したタスク
- ✅ プロジェクト初期設定（package.json、tsconfig.json、next.config.ts）
- ✅ ディレクトリ構造作成
- ✅ 基本コンポーネント作成（layout.tsx、page.tsx）
- ✅ Railwayベース再設計
- ✅ Railway PostgreSQL設定（src/lib/railway.ts）
- ✅ Railway認証システム（src/lib/auth.ts）
- ✅ データベーススキーマ設計（src/lib/database.ts）
- ✅ 型定義ファイル更新（src/types/index.ts）
- ✅ 環境変数サンプルファイル更新（env.example）
- ✅ README.md作成

## 技術スタック（Railwayベース）
- **フロントエンド**: Next.js 14, React 18, TypeScript
- **スタイリング**: Tailwind CSS
- **データベース**: Railway PostgreSQL
- **認証**: JWT + bcryptjs
- **ストレージ**: Railway Storage
- **音声処理**: OpenAI Whisper API
- **自動化**: Browserless.io (Playwright)
- **配信API**: YouTube Data API

## 注意事項
- Railwayベースの一貫したアーキテクチャを維持
- 各機能実装後は必ずテストを実施
- セキュリティ面での考慮を忘れずに
- 重複実装の防止を徹底する 