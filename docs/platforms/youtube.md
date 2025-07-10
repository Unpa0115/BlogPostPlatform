# YouTube設定ガイド

## 概要

BlogPostPlatformでは、YouTube Data API v3を使用して音声コンテンツを動画としてアップロードします。このガイドでは、YouTube APIの設定からアップロードまでを説明します。

## 前提条件

- Google Cloud Platformアカウント
- YouTube Data API v3の有効化
- OAuth 2.0認証情報の設定

## 1. Google Cloud Platform設定

### プロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成
3. プロジェクトを選択

### YouTube Data API v3の有効化

1. "APIとサービス" → "ライブラリ"に移動
2. "YouTube Data API v3"を検索
3. "有効にする"をクリック

### OAuth 2.0認証情報の作成

1. "APIとサービス" → "認証情報"に移動
2. "認証情報を作成" → "OAuth 2.0 クライアントID"を選択
3. アプリケーションの種類を選択：
   - Webアプリケーション（推奨）
   - デスクトップアプリケーション（開発用）

### 認証情報の設定

#### Webアプリケーションの場合

```
承認済みのリダイレクトURI:
- http://localhost:3000/api/platforms/youtube/callback (開発環境)
- https://your-app.railway.app/api/platforms/youtube/callback (本番環境)
```

#### デスクトップアプリケーションの場合

```
承認済みのリダイレクトURI:
- http://localhost:3000/api/platforms/youtube/callback
```

## 2. 環境変数の設定

### 開発環境 (.env.local)

```bash
# YouTube API設定
YOUTUBE_CLIENT_ID=your-youtube-client-id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your-youtube-client-secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/platforms/youtube/callback
```

### 本番環境 (Railway)

```bash
# YouTube API設定
YOUTUBE_CLIENT_ID=your-youtube-client-id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your-youtube-client-secret
YOUTUBE_REDIRECT_URI=https://your-app.railway.app/api/platforms/youtube/callback
```

## 3. 認証フローの実装

### 認証URLの生成

```typescript
// src/lib/youtube.ts
export function generateAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID!,
    redirect_uri: process.env.YOUTUBE_REDIRECT_URI!,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/youtube.upload',
    access_type: 'offline',
    prompt: 'consent'
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
```

### コールバック処理

```typescript
// src/app/api/platforms/youtube/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect('/platforms?error=youtube_auth_failed');
  }

  if (!code) {
    return NextResponse.redirect('/platforms?error=no_auth_code');
  }

  try {
    // アクセストークンの取得
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.YOUTUBE_CLIENT_ID!,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.YOUTUBE_REDIRECT_URI!,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData);
      return NextResponse.redirect('/platforms?error=token_exchange_failed');
    }

    // トークンを暗号化して保存
    const encryptedToken = encryptCredentials(JSON.stringify(tokenData));
    
    // データベースに保存
    await saveYouTubeCredentials(encryptedToken);

    return NextResponse.redirect('/platforms?success=youtube_connected');
  } catch (error) {
    console.error('YouTube callback error:', error);
    return NextResponse.redirect('/platforms?error=youtube_callback_failed');
  }
}
```

## 4. 動画アップロード機能

### アップロード関数

```typescript
// src/lib/youtube.ts
export async function uploadToYouTube(
  audioFile: Buffer,
  metadata: {
    title: string;
    description: string;
    tags: string[];
    categoryId: string;
    privacyStatus: 'private' | 'unlisted' | 'public';
  }
): Promise<string> {
  try {
    // アクセストークンを取得
    const credentials = await getYouTubeCredentials();
    const accessToken = credentials.access_token;

    // 音声ファイルを動画形式に変換
    const videoBuffer = await convertAudioToVideo(audioFile);

    // YouTube APIでアップロード
    const response = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'multipart/related',
      },
      body: createMultipartBody(videoBuffer, metadata),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`YouTube upload failed: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    return result.id;
  } catch (error) {
    console.error('YouTube upload error:', error);
    throw error;
  }
}
```

### メタデータ設定

```typescript
// src/lib/youtube.ts
export interface YouTubeMetadata {
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  privacyStatus: 'private' | 'unlisted' | 'public';
  language?: string;
  location?: string;
  recordingDate?: string;
}

export function createYouTubeMetadata(
  audioFile: AudioFile,
  transcript?: string
): YouTubeMetadata {
  return {
    title: audioFile.title || '音声コンテンツ',
    description: createDescription(audioFile, transcript),
    tags: generateTags(audioFile, transcript),
    categoryId: '22', // People & Blogs
    privacyStatus: 'private', // デフォルトは非公開
    language: 'ja',
    recordingDate: audioFile.createdAt?.toISOString(),
  };
}
```

## 5. エラーハンドリング

### よくあるエラーと対処法

#### 1. 認証エラー

```typescript
// トークンの有効性をチェック
export async function validateYouTubeToken(): Promise<boolean> {
  try {
    const credentials = await getYouTubeCredentials();
    const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo', {
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
      },
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}
```

#### 2. クォータエラー

```typescript
// クォータ使用量をチェック
export async function checkYouTubeQuota(): Promise<{
  quotaUsed: number;
  quotaLimit: number;
  remaining: number;
}> {
  // YouTube APIのクォータ情報を取得
  // 実装は省略
}
```

#### 3. ファイルサイズエラー

```typescript
// ファイルサイズをチェック
export function validateVideoFile(file: Buffer): boolean {
  const maxSize = 128 * 1024 * 1024; // 128MB
  return file.length <= maxSize;
}
```

## 6. セキュリティ考慮事項

### トークンの暗号化

```typescript
// src/lib/encryption.ts
export function encryptYouTubeToken(token: string): string {
  return encryptData(token, process.env.ENCRYPTION_KEY!);
}

export function decryptYouTubeToken(encryptedToken: string): string {
  return decryptData(encryptedToken, process.env.ENCRYPTION_KEY!);
}
```

### アクセス制御

```typescript
// ユーザー認証チェック
export async function checkYouTubeAccess(userId: string): Promise<boolean> {
  const credentials = await getYouTubeCredentials(userId);
  return credentials !== null;
}
```

## 7. テスト方法

### 認証テスト

```bash
# 認証フローのテスト
curl -X GET "http://localhost:3000/api/platforms/youtube/auth"

# コールバックのテスト
curl -X GET "http://localhost:3000/api/platforms/youtube/callback?code=test_code"
```

### アップロードテスト

```typescript
// テスト用のアップロード関数
export async function testYouTubeUpload(): Promise<void> {
  const testAudio = Buffer.from('test audio data');
  const metadata = {
    title: 'テスト動画',
    description: 'テスト用の動画です',
    tags: ['テスト'],
    categoryId: '22',
    privacyStatus: 'private' as const,
  };

  try {
    const videoId = await uploadToYouTube(testAudio, metadata);
    console.log('Upload successful:', videoId);
  } catch (error) {
    console.error('Upload failed:', error);
  }
}
```

## 8. トラブルシューティング

### よくある問題

1. **認証エラー**
   - OAuth 2.0設定の確認
   - リダイレクトURIの一致確認
   - スコープの設定確認

2. **アップロードエラー**
   - ファイルサイズの確認
   - ファイル形式の確認
   - クォータ使用量の確認

3. **トークン期限切れ**
   - リフレッシュトークンの使用
   - 再認証の実行

### デバッグ方法

```bash
# YouTube APIのログを確認
npm run debug:youtube

# 認証状態を確認
curl -X GET "http://localhost:3000/api/platforms/youtube/status"
```

## 9. パフォーマンス最適化

### バッチアップロード

```typescript
// 複数ファイルの一括アップロード
export async function batchUploadToYouTube(
  audioFiles: AudioFile[]
): Promise<{ success: string[]; failed: string[] }> {
  const results = await Promise.allSettled(
    audioFiles.map(file => uploadToYouTube(file.buffer, file.metadata))
  );

  return {
    success: results.filter(r => r.status === 'fulfilled').map(r => r.value),
    failed: results.filter(r => r.status === 'rejected').map(r => r.reason),
  };
}
```

### キャッシュ設定

```typescript
// メタデータのキャッシュ
export async function getCachedMetadata(audioFileId: string): Promise<YouTubeMetadata | null> {
  // キャッシュから取得
  // 実装は省略
}
```

## 次のステップ

1. [Voicy設定](./voicy.md)を確認
2. [Spotify設定](./spotify.md)を確認
3. [トラブルシューティング](../troubleshooting/)を参照 