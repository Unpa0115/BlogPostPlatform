# オープンソース音声配信自動化システム「BlogPostPlatform」を作りました

## はじめに

音声コンテンツが注目される中、複数のプラットフォームに配信するのは手間がかかりますよね。YouTube、Voicy、Spotify Podcast...それぞれに手動でアップロードするのは時間の無駄だと感じていました。

そこで、**音声ファイルを一度アップロードするだけで、複数のプラットフォームに自動配信できるシステム**を開発しました。今回はそのシステム「BlogPostPlatform」をオープンソースとして公開します。

## 🎯 システムの特徴

### 1. ワンクリック複数プラットフォーム配信
- **YouTube**: 動画として自動アップロード
- **Voicy**: ブラウザ自動化で投稿
- **Spotify Podcast**: RSS Feed経由で配信

### 2. 高度な音声処理機能
- **自動トリミング**: 無音部分の検出・除去
- **文字起こし**: OpenAI Whisper APIによる高精度変換
- **要約生成**: GPT-4o-miniによる自動要約

### 3. セキュアな認証情報管理
- **AES-256-GCM暗号化**: 各プラットフォームの認証情報を安全に保存
- **環境変数管理**: 開発・本番環境の適切な分離

### 4. 現代的な技術スタック
- **Next.js 14**: React Server Components対応
- **TypeScript**: 型安全性の確保
- **Railway**: 簡単デプロイとPostgreSQL
- **Prisma**: 型安全なORM

## 🚀 実際の使い方

### ステップ1: 音声ファイルをアップロード
```typescript
// ドラッグ&ドロップ対応のアップロード画面
<AudioUpload onUpload={handleAudioUpload} />
```

### ステップ2: 自動処理の実行
1. **音声前処理**: FFmpeg.wasmによる形式変換・ノイズ除去
2. **自動トリミング**: 無音検出とキーフレーズ検出
3. **文字起こし**: Whisper APIによる高精度変換
4. **要約生成**: GPT-4o-miniによる自動要約

### ステップ3: 各プラットフォームに配信
```typescript
// 一括配信API
POST /api/distribute/multi-platform
{
  "audioFileId": "audio_123",
  "platforms": ["youtube", "voicy", "spotify"],
  "metadata": {
    "title": "音声コンテンツのタイトル",
    "description": "自動生成された要約文"
  }
}
```

## 🔧 技術的な工夫

### 1. 環境分岐による最適化
開発環境と本番環境で異なるサービスを使用：

```typescript
if (process.env.NODE_ENV === 'development') {
  // 開発環境: ローカルChromeブラウザ使用（高速・コスト削減）
  browser = await chromium.launch({ headless: false });
} else {
  // 本番環境: Browserless.io使用（安定性重視）
  browser = await chromium.connect({
    wsEndpoint: `wss://chrome.browserless.io?token=${apiKey}`
  });
}
```

### 2. セキュアな認証情報管理
ユーザーの各プラットフォーム認証情報を暗号化して保存：

```typescript
// AES-256-GCM暗号化
export async function encryptCredentials(credentials: string): Promise<string> {
  const cipher = crypto.createCipher('aes-256-gcm', encryptionKey);
  let encrypted = cipher.update(credentials, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}
```

### 3. 並列処理によるパフォーマンス最適化
複数のプラットフォームへの配信を並列実行：

```typescript
const distributionPromises = platforms.map(platform => {
  switch (platform) {
    case 'youtube':
      return uploadToYouTube(audioFile, metadata);
    case 'voicy':
      return uploadToVoicy(audioFile, metadata);
    case 'spotify':
      return generateRSSFeed(audioFile, metadata);
  }
});

const results = await Promise.allSettled(distributionPromises);
```

## 📊 各プラットフォーム連携の実装

### YouTube配信
```typescript
// YouTube Data API v3を使用
const youtube = google.youtube({
  version: 'v3',
  auth: oauth2Client
});

const response = await youtube.videos.insert({
  part: ['snippet', 'status'],
  media: {
    body: audioStream
  },
  requestBody: {
    snippet: {
      title: metadata.title,
      description: metadata.description
    }
  }
});
```

### Voicy配信
```typescript
// Playwright + Browserless.ioによるブラウザ自動化
const page = await browser.newPage();
await page.goto('https://voicy.jp/upload');
await page.setInputFiles('input[type="file"]', audioFilePath);
await page.fill('#title', metadata.title);
await page.click('button[type="submit"]');
```

### Spotify Podcast配信
```typescript
// RSS Feed生成とホスティング
const rssContent = generateRSSFeed({
  title: metadata.title,
  description: metadata.description,
  audioUrl: `${baseUrl}/api/audio/${audioId}`
});

// Next.js API Routesでホスティング
export async function GET() {
  return new Response(rssContent, {
    headers: { 'Content-Type': 'application/xml' }
  });
}
```

## 📚 充実したドキュメント

オープンソースとして使いやすくするため、詳細なドキュメントを作成しました：

```
docs/
├── setup/                 # セットアップガイド
├── platforms/            # プラットフォーム設定
├── features/             # 機能詳細
├── development/          # 開発者ガイド
└── troubleshooting/      # トラブルシューティング
```

### セットアップは3ステップ
1. **リポジトリクローン**: `git clone https://github.com/yujiyamanaka/BlogPostPlatform.git`
2. **環境変数設定**: `.env.local`に必要なAPIキーを設定
3. **デプロイ**: Railwayにワンクリックデプロイ

## 🔍 実際の成果

### パフォーマンス改善
- **配信時間**: 手動操作30分 → 自動化3分（90%短縮）
- **エラー率**: 手動ミスによるエラーを大幅削減
- **コスト**: 開発環境での検証コスト削減

### セキュリティ強化
- **認証情報**: AES-256-GCM暗号化で管理者も見えない状態
- **API通信**: 適切なエラーハンドリングとレート制限
- **環境分離**: 開発・本番環境の適切な分離

## 🎉 今後の展開

### Phase 1: 環境分岐最適化（完了）
- ✅ 開発環境でのコスト削減
- ✅ 本番環境での安定性確保

### Phase 2: PWA対応（計画中）
- オフライン機能
- プッシュ通知
- インストール機能

### Phase 3: デスクトップアプリ化（検討中）
- Electron/Tauri対応
- ネイティブ機能の活用

## 📖 使ってみる

### GitHub リポジトリ
```bash
git clone https://github.com/yujiyamanaka/BlogPostPlatform.git
cd BlogPostPlatform
npm install
npm run dev
```

### Railway デプロイ
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template-id)

### ドキュメント
- 📚 [セットアップガイド](docs/setup/README.md)
- 🔧 [プラットフォーム設定](docs/platforms/README.md)
- 🚀 [API リファレンス](docs/development/api-design.md)

## 🤝 コントリビューション

このプロジェクトはMITライセンスのオープンソースです。

### 歓迎するコントリビューション
- 新しいプラットフォーム対応（TikTok、Instagram、など）
- UI/UX改善
- パフォーマンス最適化
- ドキュメント改善
- バグ修正

### 開発者向け情報
- **技術スタック**: Next.js 14, TypeScript, Prisma, Railway
- **アーキテクチャ**: Server Components, API Routes, Edge Functions
- **テスト**: Jest, React Testing Library
- **CI/CD**: GitHub Actions, Railway自動デプロイ

## まとめ

音声コンテンツの複数プラットフォーム配信を自動化する「BlogPostPlatform」を開発・公開しました。

**主な特徴：**
- 🎯 ワンクリック複数プラットフォーム配信
- 🤖 AI による音声処理・文字起こし・要約
- 🔒 セキュアな認証情報管理
- 📚 充実したドキュメント
- 🚀 簡単セットアップ・デプロイ

音声配信をされている方、開発に興味のある方、ぜひ使ってみてください！フィードバックやコントリビューションもお待ちしています。

---

**リポジトリ**: https://github.com/yujiyamanaka/BlogPostPlatform  
**ライセンス**: MIT  
**作者**: [@yujiyamanaka](https://github.com/yujiyamanaka)

#音声配信 #自動化 #オープンソース #Next.js #TypeScript #Railway 