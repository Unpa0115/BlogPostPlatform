# BlogPostPlatform開発記録 - localhost専用設定への移行とRSS Feed配信の実装

## はじめに

BlogPostPlatformは、音声取得、自動トリミング、複数配信プラットフォームへの自動アップロード機能を持つブログ投稿プラットフォームです。今回の開発では、localhost専用の設定に移行し、RSS Feed配信機能を実装しました。

## 技術スタック

- **フロントエンド**: Next.js 14.2.25, React 18.2.0, TypeScript 5.2.2
- **UI**: Shadcn/ui, Tailwind CSS, Radix UI, Lucide React
- **バックエンド**: SQLite (localhost), Railway PostgreSQL (本番)
- **認証**: Clerk
- **音声処理**: OpenAI Whisper API, FFmpeg.wasm
- **配信プラットフォーム**: YouTube Data API, Voicy (Playwright自動化), Spotify RSS
- **自動化**: Python + Playwright + Stealth

## 開発の流れ

### 1. localhost専用設定への移行

#### 背景
当初はRailwayでの本番環境とlocalhostでの開発環境の両方をサポートしていましたが、開発効率を向上させるため、localhost専用の設定に移行することにしました。

#### 実施した変更

**データベース設定の変更**
- PostgreSQL関連のコードを削除
- SQLiteのみを使用するように修正
- `src/lib/storage.ts`、`src/lib/auth.ts`、APIルートを修正

**認証機能の無効化**
- ログインページをエントリーポイントから外す
- ナビゲーションからログインリンクを削除
- すべてのページで認証チェックを削除
- 認証ヘッダーを削除

**修正したファイル**
- `src/app/page.tsx` - メインダッシュボード
- `src/app/platforms/page.tsx` - プラットフォーム設定ページ
- `src/app/upload/page.tsx` - アップロードページ
- `src/components/navigation.tsx` - ナビゲーション
- `src/lib/storage.ts` - SQLiteデータベース管理
- `src/lib/auth.ts` - 認証機能（SQLite対応）

### 2. Railway RSS Feed配信の実装

#### 背景
Spotify Podcast配信のために、RSS FeedをRailwayでホスティングする必要がありました。

#### 実施した作業

**RSS Feed専用デプロイ環境の構築**
- `rss-feed-deploy`ディレクトリを作成
- Railwayでの静的サイトホスティング設定
- `feed.xml`の生成と配信

**Railway設定の最適化**
- `railway.json`の設定を簡素化
- ファイル構造の最適化（`feed.xml`をルートに移動）
- 適切なContent-Typeヘッダーの設定

**RSS Feed URL**
- `https://blogpostplatform-production.up.railway.app/feed.xml`
- `https://blogpostplatform-production.up.railway.app/` (ルートでも同じファイル)

### 3. 技術的課題の解決

#### pgモジュールエラーの解決
**問題**: ビルド時にpgモジュールが見つからないエラーが発生
**原因**: PostgreSQL関連コードの残存
**解決策**: 
- PostgreSQL関連コードを完全に削除
- SQLiteのみを使用するように修正
- 依存関係を再インストール

#### Railway RSS Feed 404エラーの解決
**問題**: RailwayでのRSS Feedが404エラーでアクセスできない
**原因**: 静的サイトデプロイの設定が複雑すぎて、Railwayのビルダーと競合
**解決策**:
- `railway.json`の設定を簡素化
- ファイル構造を最適化
- GitHubへのプッシュによる自動デプロイ

## 実装された機能

### 1. 音声ファイルアップロード機能
- ドラッグ&ドロップ対応
- 複数ファイル形式対応（MP3, WAV, M4A, MP4, AVI, MOV等）
- ファイルサイズ制限（2GB以下）

### 2. 自動トリミング機能
- OpenAI Whisper API連携
- キーフレーズ検出
- 無音部分の自動トリミング

### 3. 複数配信プラットフォーム対応
- **YouTube**: YouTube Data API v3を使用した動画アップロード
- **Voicy**: Playwright自動化によるブラウザ操作
- **Spotify**: RSS Feed生成によるポッドキャスト配信

### 4. RSS Feed生成・配信機能
- RSS 2.0形式のXML生成
- iTunes Podcast対応
- Railwayでの静的ホスティング

### 5. localhost専用設定
- SQLiteデータベース使用
- 認証不要のダッシュボード
- 開発効率の向上

## 開発で得られた知見

### 1. 環境分岐の設計
- 開発環境と本番環境の分離
- データベースの環境別設定
- 認証機能の無効化と再有効化の方法

### 2. Railwayでの静的サイトホスティング
- 適切な設定ファイルの作成
- ファイル構造の最適化
- 自動デプロイの仕組み

### 3. RSS Feed配信の実装
- RSS 2.0仕様の理解
- iTunes Podcast対応
- 動的RSS Feed生成

### 4. 認証不要アプリケーションの設計
- 認証フローの簡素化
- 開発効率の向上
- 将来的な認証機能の再有効化への配慮

## 今後の展望

### 1. 機能拡張
- より多くの配信プラットフォームへの対応
- 音声処理機能の強化
- ユーザーインターフェースの改善

### 2. 本番環境への移行
- 認証機能の再有効化
- PostgreSQLへの移行
- セキュリティの強化

### 3. パフォーマンス最適化
- キャッシュ戦略の改善
- 画像・音声ファイルの最適化
- バンドルサイズの削減

## まとめ

今回の開発では、localhost専用の設定に移行することで開発効率を大幅に向上させ、RSS Feed配信機能を実装することでSpotify Podcast配信に対応しました。

技術的な課題を一つずつ解決していく過程で、環境分岐の設計、Railwayでの静的サイトホスティング、RSS Feed配信の実装など、多くの知見を得ることができました。

今後の開発では、これらの基盤を活用して、より多くの機能を実装し、ユーザーにとって価値のあるプラットフォームにしていきたいと思います。

---

**開発期間**: 2025年1月28日  
**技術スタック**: Next.js, React, TypeScript, SQLite, Railway  
**GitHub**: [BlogPostPlatform](https://github.com/Unpa0115/BlogPostPlatform) 