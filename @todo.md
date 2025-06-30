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

- [x] 依存関係のインストール
  - Railway用パッケージのインストール完了
  - 見積時間: 5分

- [x] Replitコードの統合
  - client_replitとserver_replitの機能をNext.jsに移行
  - データベーススキーマの統合
  - API Routesの実装
  - 見積時間: 3時間

- [x] APIエンドポイント修正
  - Next.js App Router構造に合わせたAPIルート修正
  - /api/uploads/trim、/api/platforms/youtube-upload、/api/platforms/voicy-upload
  - RSS Feed生成のURL検証修正
  - 見積時間: 1時間

- [x] ファイルサイズ表示とAPIエラー修正
  - アップロード済みファイルのサイズ表示修正
  - トリミングAPIのffmpeg出力パス設定修正
  - YouTube/VoicyアップロードAPIのファイルパス処理改善
  - エラーハンドリングの強化
  - 見積時間: 1.5時間

- [x] YouTubeアップロード機能の実装
  - youtube-service.tsを参考にしたOAuth認証フロー実装
  - YouTubeClientクラスの作成
  - 認証コールバックAPIの追加
  - アップロード処理の改善
  - 見積時間: 2時間

- [x] Voicyアップロード機能の修正
  - Pythonスクリプト（voicy_automation.py）を使用するように変更
  - Playwright直接使用からPythonスクリプト実行に変更
  - 環境変数とコマンドライン引数の適切な設定
  - フロントエンドのaudioFilesパラメータ送信修正
  - Python環境のセットアップ（requirements.txt、setup-python.sh）
  - デバッグログの追加
  - 見積時間: 2時間

- [x] Voicy認証情報のAPI取得機能実装
  - ハードコードされた認証情報を削除
  - /api/platforms/voicy-credentialsエンドポイントの作成
  - PythonスクリプトとTypeScriptファイルの修正
  - 認証情報の暗号化・復号化処理の実装
  - セキュリティ強化とエラーハンドリングの追加
  - 見積時間: 2時間

- [ ] Railwayプロジェクト設定
  - Railwayプロジェクト作成
  - 環境変数設定
  - データベース初期化
  - 見積時間: 45分

### 🟡 重要 - 認証・ユーザー管理
- [x] Railway認証システムの実装
  - JWT認証システム
  - ログイン・サインアップ機能
  - 認証状態管理
  - 見積時間: 2時間

- [ ] ユーザープロフィール管理
  - プロフィール編集機能
  - 見積時間: 1時間

### 🟡 重要 - 音声管理機能
- [x] 音声ファイルアップロード機能
  - Railway Storage連携
  - ドラッグ&ドロップ対応
  - ファイル形式検証
  - 見積時間: 2時間

- [x] 音声ファイル管理UI
  - ファイル一覧表示
  - 削除・編集機能
  - 見積時間: 1.5時間

- [ ] 音声プレビュー機能
  - Web Audio APIを使用した再生機能
  - 見積時間: 1.5時間

### 🟢 通常 - 自動トリミング機能
- [x] Whisper API連携
  - 音声解析機能
  - キーフレーズ検出
  - 見積時間: 3時間

- [x] 自動トリミングUI
  - トリミング設定画面
  - プレビュー機能
  - 見積時間: 2時間

### 🟢 通常 - 配信プラットフォーム連携
- [x] プラットフォーム管理UI
  - YouTube、Voicy、Spotify設定画面
  - 認証情報管理
  - 見積時間: 2時間

- [x] 配信機能フロントエンド実装
  - 各プラットフォームへの一括配信機能
  - トグルボタンによる配信先選択
  - 設定未完了時の無効化機能
  - 配信状況のリアルタイム表示
  - 見積時間: 3時間

- [x] Browserless.io連携
  - Voicy自動アップロード機能（Pythonスクリプト使用）
  - Playwright + Stealth による自動化
  - 見積時間: 4時間

- [x] YouTube Data API連携
  - YouTube動画アップロード機能
  - OAuth認証フロー実装
  - 見積時間: 3時間

- [x] RSS Feed生成機能
  - Spotify配信用RSS生成
  - URL検証機能追加
  - 見積時間: 1.5時間

- [x] Spotify RSS Feed 50件制限対応
  - アーカイブ機能の実装
  - 自動制限管理システム
  - 統計情報表示機能
  - アーカイブからの復元機能
  - RSS Feed管理UIの追加
  - 見積時間: 3時間

### 🟢 通常 - ジョブ管理システム
- [x] ジョブ管理データベース設計
  - jobs、distribution_platformsテーブル
  - 見積時間: 1時間

- [x] ジョブ管理UI
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

- [x] ダッシュボード機能
  - 統計情報表示
  - KPI可視化
  - 見積時間: 3時間

- [ ] 前処理プラットフォームの改良（優先度：低）
  - 前処理（トリミング等）の前後でどこがカットされるか可視化
  - 文字起こしの結果を表示できるようにする
  - 前処理・文字起こしの結果を保存できるようにする

## 現在の進捗状況
- [x] Replitコード統合完了
  - データベーススキーマ統合完了
  - API Routes実装完了（uploads, jobs, stats, platforms）
  - フロントエンドコンポーネント実装完了
  - ナビゲーション実装完了
  - [x] 配信機能フロントエンド実装完了
    - DistributionManagerコンポーネント作成
    - usePlatformsフック作成
    - アップロードページへの統合
    - 設定状態に基づくトグル制御
  - [x] APIエンドポイント修正完了
    - Next.js App Router構造に合わせた修正
    - 404エラーの解決
    - RSS Feed生成の改善
  - [x] ファイルサイズ表示とAPIエラー修正完了
    - アップロード済みファイルのサイズ表示修正
    - トリミングAPIのffmpeg出力パス設定修正
    - YouTube/VoicyアップロードAPIのファイルパス処理改善
    - エラーハンドリングの強化
  - [x] YouTubeアップロード機能実装完了
    - youtube-service.tsを参考にしたOAuth認証フロー実装
    - YouTubeClientクラスの作成
    - 認証コールバックAPIの追加
    - アップロード処理の改善
  - [x] Voicyアップロード機能修正完了
    - Pythonスクリプトを使用するように変更
    - フロントエンドのaudioFilesパラメータ送信修正
    - Python環境のセットアップ完了
  - [x] Voicy認証情報のAPI取得機能実装完了
    - セキュリティ強化：ハードコードされた認証情報を削除
    - API統合：プラットフォーム設定から認証情報を取得
    - 暗号化対応：認証情報の安全な保存・取得
    - エラーハンドリング：適切なエラーメッセージとログ出力
  - [x] Spotify RSS Feed 50件制限対応完了
    - RssGeneratorクラスにアーカイブ機能を追加
    - 自動制限管理システムの実装
    - 統計情報取得APIの追加
    - アーカイブ管理APIの追加
    - RssFeedManager UIコンポーネントの作成
    - 設定ページへの統合
  - 次: 機能テストとRailwayプロジェクト設定

## 次のアクション
1. ファイルアップロード機能のテスト
2. トリミング機能のテスト
3. YouTubeアップロード機能のテスト
4. Voicyアップロード機能のテスト
5. RSS Feed生成のテスト
6. Railwayプロジェクトの設定
7. 環境変数の設定
8. データベース初期化（npm run db:init）

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
- ✅ 依存関係インストール完了
- ✅ README.md作成
- ✅ Replitコード統合
- ✅ API Routes実装（uploads, jobs, stats, platforms）
- ✅ フロントエンドコンポーネント実装
- ✅ ナビゲーション実装
- ✅ ダッシュボード機能実装
- ✅ 配信機能フロントエンド実装
  - DistributionManagerコンポーネント
  - usePlatformsフック
  - アップロードページ統合
  - 設定状態管理
- ✅ APIエンドポイント修正
  - Next.js App Router構造対応
  - 404エラー解決
  - RSS Feed生成改善
- ✅ ファイルサイズ表示とAPIエラー修正
  - アップロード済みファイルのサイズ表示修正
  - トリミングAPIのffmpeg出力パス設定修正
  - YouTube/VoicyアップロードAPIのファイルパス処理改善
  - エラーハンドリングの強化
- ✅ YouTubeアップロード機能実装
  - youtube-service.tsを参考にしたOAuth認証フロー実装
  - YouTubeClientクラスの作成
  - 認証コールバックAPIの追加
  - アップロード処理の改善
- ✅ Voicyアップロード機能修正
  - Pythonスクリプトを使用するように変更
  - フロントエンドのaudioFilesパラメータ送信修正
  - Python環境のセットアップ完了
- ✅ Voicy認証情報のAPI取得機能実装完了
  - セキュリティ強化：ハードコードされた認証情報を削除
  - API統合：プラットフォーム設定から認証情報を取得
  - 暗号化対応：認証情報の安全な保存・取得
  - エラーハンドリング：適切なエラーメッセージとログ出力
- ✅ Spotify RSS Feed 50件制限対応完了
  - RssGeneratorクラスにアーカイブ機能を追加
  - 自動制限管理システムの実装
  - 統計情報取得APIの追加
  - アーカイブ管理APIの追加
  - RssFeedManager UIコンポーネントの作成
  - 設定ページへの統合
- ✅ 直近アップロードの再アップロード・ダウンロード・削除機能の実装
  - UIボタンに各機能を実装
  - バックエンドAPI（DELETE）を追加
  - トースト通知・確認ダイアログ対応

## 技術スタック（Railwayベース）
- **フロントエンド**: Next.js 14, React 18, TypeScript
- **スタイリング**: Tailwind CSS, shadcn/ui
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