# Spotify設定ガイド

## 概要

BlogPostPlatformでは、RSS Feedを生成してSpotify Podcastsに配信します。このガイドでは、Spotify用RSS Feedの生成と配信方法を説明します。

## 前提条件

- Spotify for Podcastersアカウント
- 音声ファイル（MP3形式推奨）
- RSS Feedホスティング環境

## 1. Spotify for Podcasters設定

### アカウント作成

1. [Spotify for Podcasters](https://podcasters.spotify.com/)にアクセス
2. Spotifyアカウントでログイン
3. ポッドキャストを作成

### RSS Feed URLの取得

1. Spotify for Podcastersダッシュボードにアクセス
2. "Settings" → "RSS Feed"を選択
3. RSS Feed URLをコピー

## 2. RSS Feed生成の実装

### RSS Feedジェネレーター

```typescript
// src/lib/rss-generator.ts
import { createRSSFeed, RSSFeedItem } from 'rss-generator';

export interface SpotifyPodcastMetadata {
  title: string;
  description: string;
  author: string;
  language: string;
  category: string;
  explicit: boolean;
  imageUrl?: string;
}

export interface SpotifyEpisodeMetadata {
  title: string;
  description: string;
  audioUrl: string;
  duration: number;
  publishDate: Date;
  episodeNumber?: number;
  seasonNumber?: number;
  explicit?: boolean;
  imageUrl?: string;
}

export class SpotifyRSSGenerator {
  private feedUrl: string;
  private metadata: SpotifyPodcastMetadata;

  constructor(feedUrl: string, metadata: SpotifyPodcastMetadata) {
    this.feedUrl = feedUrl;
    this.metadata = metadata;
  }

  generateRSSFeed(episodes: SpotifyEpisodeMetadata[]): string {
    const feed = createRSSFeed({
      title: this.metadata.title,
      description: this.metadata.description,
      feed_url: this.feedUrl,
      site_url: this.feedUrl,
      image_url: this.metadata.imageUrl,
      managingEditor: this.metadata.author,
      webMaster: this.metadata.author,
      copyright: `Copyright ${new Date().getFullYear()} ${this.metadata.author}`,
      language: this.metadata.language,
      categories: [this.metadata.category],
      pubDate: new Date(),
      ttl: 60,
      custom_namespaces: {
        'itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd',
        'spotify': 'http://www.spotify.com/ns/rss'
      }
    });

    // iTunes固有の要素を追加
    feed.addElement('itunes:author', this.metadata.author);
    feed.addElement('itunes:summary', this.metadata.description);
    feed.addElement('itunes:explicit', this.metadata.explicit ? 'yes' : 'no');
    feed.addElement('itunes:category', { text: this.metadata.category });
    
    if (this.metadata.imageUrl) {
      feed.addElement('itunes:image', { href: this.metadata.imageUrl });
    }

    // エピソードを追加
    episodes.forEach(episode => {
      const item = feed.addItem({
        title: episode.title,
        description: episode.description,
        url: episode.audioUrl,
        guid: episode.audioUrl,
        categories: [this.metadata.category],
        author: this.metadata.author,
        date: episode.publishDate,
        enclosure: {
          url: episode.audioUrl,
          size: 0, // サイズは動的に計算
          type: 'audio/mpeg'
        }
      });

      // iTunes固有のエピソード要素
      item.addElement('itunes:title', episode.title);
      item.addElement('itunes:summary', episode.description);
      item.addElement('itunes:duration', this.formatDuration(episode.duration));
      item.addElement('itunes:explicit', episode.explicit ? 'yes' : 'no');
      
      if (episode.episodeNumber) {
        item.addElement('itunes:episode', episode.episodeNumber.toString());
      }
      
      if (episode.seasonNumber) {
        item.addElement('itunes:season', episode.seasonNumber.toString());
      }
      
      if (episode.imageUrl) {
        item.addElement('itunes:image', { href: episode.imageUrl });
      }
    });

    return feed.xml({ indent: true });
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }
}
```

## 3. RSS Feed APIエンドポイント

### RSS Feed生成API

```typescript
// src/app/api/rss/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SpotifyRSSGenerator } from '@/lib/rss-generator';
import { getPodcastMetadata, getEpisodes } from '@/lib/spotify-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // ポッドキャストメタデータを取得
    const metadata = await getPodcastMetadata(userId);
    
    // エピソード一覧を取得
    const episodes = await getEpisodes(userId);
    
    // RSS Feedを生成
    const generator = new SpotifyRSSGenerator(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/rss?user=${userId}`,
      metadata
    );
    
    const rssFeed = generator.generateRSSFeed(episodes);
    
    // RSS Feedを返却
    return new NextResponse(rssFeed, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600' // 1時間キャッシュ
      }
    });

  } catch (error) {
    console.error('RSS Feed generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate RSS Feed' },
      { status: 500 }
    );
  }
}
```

### RSS Feed統計API

```typescript
// src/app/api/rss/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getRSSFeedStats } from '@/lib/rss-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const stats = await getRSSFeedStats(userId);
    
    return NextResponse.json(stats);

  } catch (error) {
    console.error('RSS stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get RSS stats' },
      { status: 500 }
    );
  }
}
```

## 4. Spotifyサービス実装

### Spotifyサービス

```typescript
// src/lib/spotify-service.ts
import { prisma } from '@/lib/database';
import { encryptData, decryptData } from '@/lib/encryption';

export interface SpotifyCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export async function saveSpotifyCredentials(
  userId: string,
  credentials: SpotifyCredentials
): Promise<void> {
  const encryptedCredentials = encryptData(
    JSON.stringify(credentials),
    process.env.ENCRYPTION_KEY!
  );

  await prisma.platformCredentials.upsert({
    where: { userId_platform: { userId, platform: 'spotify' } },
    update: { credentials: encryptedCredentials },
    create: { userId, platform: 'spotify', credentials: encryptedCredentials }
  });
}

export async function getSpotifyCredentials(userId: string): Promise<SpotifyCredentials> {
  const record = await prisma.platformCredentials.findUnique({
    where: { userId_platform: { userId, platform: 'spotify' } }
  });

  if (!record) {
    throw new Error('Spotify credentials not found');
  }

  const decryptedData = decryptData(record.credentials, process.env.ENCRYPTION_KEY!);
  return JSON.parse(decryptedData);
}

export async function getPodcastMetadata(userId: string): Promise<SpotifyPodcastMetadata> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { podcastSettings: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  return {
    title: user.podcastSettings?.title || 'My Podcast',
    description: user.podcastSettings?.description || 'A podcast about interesting topics',
    author: user.podcastSettings?.author || user.name || 'Unknown',
    language: user.podcastSettings?.language || 'ja',
    category: user.podcastSettings?.category || 'Technology',
    explicit: user.podcastSettings?.explicit || false,
    imageUrl: user.podcastSettings?.imageUrl
  };
}

export async function getEpisodes(userId: string): Promise<SpotifyEpisodeMetadata[]> {
  const episodes = await prisma.episode.findMany({
    where: { userId },
    orderBy: { publishDate: 'desc' },
    include: { audioFile: true }
  });

  return episodes.map(episode => ({
    title: episode.title,
    description: episode.description,
    audioUrl: episode.audioFile.url,
    duration: episode.duration,
    publishDate: episode.publishDate,
    episodeNumber: episode.episodeNumber,
    seasonNumber: episode.seasonNumber,
    explicit: episode.explicit,
    imageUrl: episode.imageUrl
  }));
}
```

## 5. RSS Feed管理機能

### RSS Feed管理コンポーネント

```typescript
// src/components/rss-feed-manager.tsx
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RSSFeedManagerProps {
  userId: string;
}

export function RSSFeedManager({ userId }: RSSFeedManagerProps) {
  const [feedUrl, setFeedUrl] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/rss?user=${userId}`;
    setFeedUrl(url);
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rss/stats?user=${userId}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load RSS stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyFeedUrl = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      // 成功メッセージを表示
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spotify RSS Feed</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="feed-url">RSS Feed URL</Label>
          <div className="flex gap-2">
            <Input
              id="feed-url"
              value={feedUrl}
              readOnly
              className="flex-1"
            />
            <Button onClick={copyFeedUrl} variant="outline">
              Copy
            </Button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Total Episodes</Label>
              <p className="text-2xl font-bold">{stats.totalEpisodes}</p>
            </div>
            <div>
              <Label>Last Updated</Label>
              <p className="text-sm text-gray-600">
                {new Date(stats.lastUpdated).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p>このRSS Feed URLをSpotify for Podcastersに設定してください。</p>
          <p>新しいエピソードが追加されると、自動的にRSS Feedが更新されます。</p>
        </div>
      </CardContent>
    </Card>
  );
}
```

## 6. エラーハンドリング

### RSS Feed検証

```typescript
// src/lib/rss-service.ts
export async function validateRSSFeed(feedUrl: string): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const response = await fetch(feedUrl);
    const xml = await response.text();

    // XML構文チェック
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    
    if (doc.getElementsByTagName('parsererror').length > 0) {
      errors.push('Invalid XML format');
    }

    // 必須要素のチェック
    const requiredElements = ['title', 'description', 'item'];
    requiredElements.forEach(element => {
      if (doc.getElementsByTagName(element).length === 0) {
        errors.push(`Missing required element: ${element}`);
      }
    });

    // iTunes要素のチェック
    const itunesElements = ['itunes:author', 'itunes:summary'];
    itunesElements.forEach(element => {
      if (doc.getElementsByTagName(element).length === 0) {
        warnings.push(`Missing iTunes element: ${element}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };

  } catch (error) {
    return {
      isValid: false,
      errors: ['Failed to fetch RSS Feed'],
      warnings: []
    };
  }
}
```

## 7. テスト方法

### RSS Feed生成テスト

```typescript
// tests/rss-generator.test.ts
import { SpotifyRSSGenerator } from '@/lib/rss-generator';

describe('SpotifyRSSGenerator', () => {
  const metadata = {
    title: 'Test Podcast',
    description: 'A test podcast',
    author: 'Test Author',
    language: 'ja',
    category: 'Technology',
    explicit: false
  };

  const episodes = [
    {
      title: 'Episode 1',
      description: 'First episode',
      audioUrl: 'https://example.com/episode1.mp3',
      duration: 1800,
      publishDate: new Date('2024-01-01'),
      episodeNumber: 1
    }
  ];

  it('should generate valid RSS Feed', () => {
    const generator = new SpotifyRSSGenerator('https://example.com/feed', metadata);
    const rss = generator.generateRSSFeed(episodes);

    expect(rss).toContain('<rss');
    expect(rss).toContain('<title>Test Podcast</title>');
    expect(rss).toContain('<item>');
    expect(rss).toContain('itunes:');
  });
});
```

## 8. トラブルシューティング

### よくある問題

1. **RSS Feedが更新されない**
   - キャッシュの確認
   - ファイル権限の確認
   - データベース接続の確認

2. **Spotifyで認識されない**
   - RSS Feed URLの確認
   - XML形式の検証
   - 必須要素の確認

3. **音声ファイルが再生されない**
   - ファイルURLの確認
   - ファイル形式の確認
   - アクセス権限の確認

### デバッグ方法

```bash
# RSS Feedの確認
curl -X GET "http://localhost:3000/api/rss?user=your-user-id"

# RSS Feed統計の確認
curl -X GET "http://localhost:3000/api/rss/stats?user=your-user-id"

# RSS Feed検証
npm run validate:rss
```

## 9. パフォーマンス最適化

### キャッシュ設定

```typescript
// src/lib/rss-service.ts
export class RSSFeedCache {
  private static cache = new Map<string, { feed: string; timestamp: number }>();
  private static cacheTimeout = 3600 * 1000; // 1時間

  static async getCachedFeed(userId: string): Promise<string | null> {
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.feed;
    }
    return null;
  }

  static setCachedFeed(userId: string, feed: string): void {
    this.cache.set(userId, { feed, timestamp: Date.now() });
  }

  static clearCache(userId?: string): void {
    if (userId) {
      this.cache.delete(userId);
    } else {
      this.cache.clear();
    }
  }
}
```

### バッチ処理

```typescript
// 複数ユーザーのRSS Feed一括更新
export async function batchUpdateRSSFeeds(userIds: string[]): Promise<{
  success: string[];
  failed: string[];
}> {
  const results = await Promise.allSettled(
    userIds.map(userId => updateRSSFeed(userId))
  );

  return {
    success: results.filter(r => r.status === 'fulfilled').map(r => r.value),
    failed: results.filter(r => r.status === 'rejected').map(r => r.reason)
  };
}
```

## 次のステップ

1. [YouTube設定](./youtube.md)を確認
2. [Voicy設定](./voicy.md)を確認
3. [トラブルシューティング](../troubleshooting/)を参照 