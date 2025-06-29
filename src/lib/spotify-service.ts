import { RssGenerator } from './rss-generator';

export class SpotifyService {
  private rssGenerator: RssGenerator;

  constructor() {
    this.rssGenerator = new RssGenerator();
  }

  /**
   * Spotify用の統合RSS FeedのURLを取得
   */
  getRssFeedUrl(): string {
    return this.rssGenerator.getFeedUrl();
  }

  /**
   * Spotify用の統合RSS Feedを更新
   */
  async updateRssFeed(uploadId: string): Promise<void> {
    try {
      await this.rssGenerator.addEpisode(uploadId);
      console.log(`✅ Spotify RSS feed updated for upload: ${uploadId}`);
    } catch (error) {
      console.error('❌ Failed to update Spotify RSS feed:', error);
      throw error;
    }
  }

  /**
   * Spotify用の統合RSS Feedを再生成
   */
  async regenerateRssFeed(): Promise<void> {
    try {
      await this.rssGenerator.regenerateFeed();
      console.log('✅ Spotify RSS feed regenerated');
    } catch (error) {
      console.error('❌ Failed to regenerate Spotify RSS feed:', error);
      throw error;
    }
  }

  /**
   * Spotify用のRSS Feed情報を取得
   */
  getRssFeedInfo(): {
    url: string;
    title: string;
    description: string;
    language: string;
  } {
    return {
      url: this.getRssFeedUrl(),
      title: 'AutoPost Spotify Podcast Feed',
      description: 'Automatically generated podcast feed for Spotify synchronization',
      language: 'ja'
    };
  }
}

export const spotifyService = new SpotifyService(); 