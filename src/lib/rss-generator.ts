import { promises as fs } from 'fs';
import path from 'path';
import { storage } from './storage';

interface RssEpisode {
  id: number;
  title: string;
  description?: string | null;
  filePath: string;
  fileSize: number;
  mimeType: string;
  pubDate: Date;
  duration?: string;
  guid: string;
}

interface RssFeedStats {
  totalEpisodes: number;
  activeEpisodes: number;
  archivedEpisodes: number;
  oldestActiveEpisode: Date | null;
  newestActiveEpisode: Date | null;
}

export class RssGenerator {
  private feedDir = './public/rss';
  private feedPath = path.join(this.feedDir, 'spotify-feed.xml');
  private archivePath = path.join(this.feedDir, 'spotify-feed-archive.json');
  private baseUrl: string;
  private readonly MAX_EPISODES = 50; // Spotify制限

  constructor() {
    // Use Next.js environment for base URL
    this.baseUrl = this.getBaseUrl();
    
    this.ensureFeedDirectory();
  }

  private getBaseUrl(): string {
    const nodeEnv = process.env.NODE_ENV;
    const isLocalhost = process.env.LOCALHOST_RSS_ENABLED === 'true';
    
    if (nodeEnv === 'development' && isLocalhost) {
      // localhost環境でGitHub Pagesを使用
      return process.env.GITHUB_PAGES_URL || 'https://your-username.github.io/your-repo-name';
    } else if (nodeEnv === 'production') {
      // Railway環境では従来通り
      return process.env.NEXT_PUBLIC_APP_URL || 'https://blogpostplatform-production.up.railway.app';
    } else {
      // その他の環境
      return 'http://localhost:3000';
    }
  }

  private getMediaUrl(episodeId: number): string {
    const nodeEnv = process.env.NODE_ENV;
    const isLocalhost = process.env.LOCALHOST_RSS_ENABLED === 'true';
    
    if (nodeEnv === 'development' && isLocalhost) {
      // localhost環境でGitHub PagesのメディアURL
      return `${this.baseUrl}/media/${episodeId}`;
    } else {
      // Railway環境では従来通り
      return `${this.baseUrl}/api/rss/media/${episodeId}`;
    }
  }

  async addEpisodeToFeed(episodeData: {
    title: string;
    description: string;
    filePath: string;
    publishDate: string;
    fileSize: number;
    mimeType: string;
  }): Promise<void> {
    console.log(`📡 Adding episode to unified RSS feed: ${episodeData.title}`);
    
    try {
      // Generate updated RSS feed
      await this.regenerateFeed();
      console.log(`✅ Unified RSS feed updated with episode: ${episodeData.title}`);
      
    } catch (error) {
      console.error('❌ Failed to add episode to unified RSS feed:', error);
      throw error;
    }
  }

  private async ensureFeedDirectory() {
    try {
      await fs.mkdir(this.feedDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create RSS feed directory:', error);
    }
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private generateRssXml(episodes: RssEpisode[]): string {
    const now = new Date().toUTCString();
    
    const episodeItems = episodes.map(episode => {
      const fileUrl = this.getMediaUrl(episode.id);
      const pubDate = episode.pubDate.toUTCString();
      
      return `    <item>
      <title><![CDATA[${episode.title}]]></title>
      <description><![CDATA[${episode.description || ''}]]></description>
      <enclosure url="${fileUrl}" length="${episode.fileSize}" type="${episode.mimeType}" />
      <guid isPermaLink="false">${episode.guid}</guid>
      <pubDate>${pubDate}</pubDate>
      <itunes:duration>${episode.duration || '00:00'}</itunes:duration>
      <itunes:explicit>no</itunes:explicit>
    </item>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>AutoPost Spotify Podcast Feed</title>
    <link>${this.getFeedUrl()}</link>
    <description>Automatically generated podcast feed for Spotify synchronization</description>
    <language>ja</language>
    <copyright>© 2025 AutoPost</copyright>
    <lastBuildDate>${now}</lastBuildDate>
    <pubDate>${now}</pubDate>
    <itunes:category text="Technology" />
    <itunes:explicit>no</itunes:explicit>
    <itunes:image href="${this.baseUrl}/podcast-cover.jpg" />
    <itunes:author>AutoPost System</itunes:author>
    <itunes:summary>Automatically generated podcast feed for multi-platform distribution</itunes:summary>
${episodeItems}
  </channel>
</rss>`;
  }

  async addEpisode(uploadId: string): Promise<void> {
    try {
      console.log(`🔍 Adding episode to RSS feed: ${uploadId}`)
      
      const upload = await storage.getUpload(uploadId);
      console.log(`📋 Upload data:`, upload)
      
      if (!upload) {
        throw new Error(`Upload ${uploadId} not found`);
      }

      // Check if upload is audio format suitable for podcast
      if (!upload.mime_type.startsWith('audio/')) {
        console.log(`Skipping RSS feed update for non-audio file: ${upload.mime_type}`);
        return;
      }

      const episode: RssEpisode = {
        id: parseInt(upload.id),
        title: upload.title,
        description: upload.description || undefined,
        filePath: upload.processed_file_path || upload.file_path,
        fileSize: upload.file_size,
        mimeType: upload.mime_type,
        pubDate: upload.created_at instanceof Date 
          ? upload.created_at 
          : new Date(upload.created_at),
        guid: `autopost-${upload.id}-${Date.now()}`,
      };

      console.log(`📝 Episode data:`, episode)

      // Get existing episodes from RSS feed
      const existingEpisodes = await this.getExistingEpisodes();
      console.log(`📚 Found ${existingEpisodes.length} existing episodes`)
      
      // Check if episode already exists
      const episodeExists = existingEpisodes.some(ep => ep.id === parseInt(upload.id));
      if (episodeExists) {
        console.log(`Episode ${upload.id} already exists in unified RSS feed`);
        return;
      }

      // Add new episode at the beginning (most recent first)
      const allEpisodes = [episode, ...existingEpisodes];
      
      // Handle episode limit and archiving
      const { activeEpisodes, archivedEpisodes } = await this.manageEpisodeLimit(allEpisodes);

      // Generate feed with active episodes only
      await this.generateFeed(activeEpisodes);
      
      // Save archived episodes
      await this.saveArchivedEpisodes(archivedEpisodes);
      
      console.log(`✅ Unified RSS feed updated with episode: ${upload.title}`);
      console.log(`📊 Active episodes: ${activeEpisodes.length}, Archived: ${archivedEpisodes.length}`);
      
    } catch (error) {
      console.error('❌ Failed to add episode to unified RSS feed:', error);
      throw error;
    }
  }

  private async getExistingEpisodes(): Promise<RssEpisode[]> {
    try {
      // Get all completed uploads that are audio files
      const uploads = await storage.getAllUploads();
      const audioUploads = uploads.filter(upload => 
        upload.mime_type.startsWith('audio/') && 
        upload.status === 'completed'
      );

      return audioUploads.map(upload => {
        // created_atをDateオブジェクトに変換
        const pubDate = upload.created_at instanceof Date 
          ? upload.created_at 
          : new Date(upload.created_at);
        
        return {
          id: parseInt(upload.id),
          title: upload.title,
          description: upload.description || undefined,
          filePath: upload.processed_file_path || upload.file_path,
          fileSize: upload.file_size,
          mimeType: upload.mime_type,
          pubDate: pubDate,
          guid: `autopost-${upload.id}-${pubDate.getTime()}`,
        };
      }).sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
      
    } catch (error) {
      console.error('Failed to get existing episodes:', error);
      return [];
    }
  }

  private async generateFeed(episodes: RssEpisode[]): Promise<void> {
    try {
      const rssXml = this.generateRssXml(episodes);
      await fs.writeFile(this.feedPath, rssXml, 'utf8');
      console.log(`Unified RSS feed generated: ${this.feedPath}`);
    } catch (error) {
      console.error('Failed to generate unified RSS feed:', error);
      throw error;
    }
  }

  async regenerateFeed(): Promise<void> {
    try {
      const episodes = await this.getExistingEpisodes();
      await this.generateFeed(episodes);
      console.log(`✅ Unified RSS feed regenerated with ${episodes.length} episodes`);
    } catch (error) {
      console.error('Failed to regenerate unified RSS feed:', error);
      throw error;
    }
  }

  getFeedUrl(): string {
    const nodeEnv = process.env.NODE_ENV;
    const isLocalhost = process.env.LOCALHOST_RSS_ENABLED === 'true';
    
    if (nodeEnv === 'development' && isLocalhost) {
      // localhost環境でGitHub PagesのRSS Feed URL
      return `${this.baseUrl}/rss/spotify-feed.xml`;
    } else {
      // Railway環境では従来通り
      return `${this.baseUrl}/api/rss`;
    }
  }

  getFeedPath(): string {
    return this.feedPath;
  }

  /**
   * エピソード制限を管理し、古いエピソードをアーカイブに移動
   */
  private async manageEpisodeLimit(allEpisodes: RssEpisode[]): Promise<{
    activeEpisodes: RssEpisode[];
    archivedEpisodes: RssEpisode[];
  }> {
    if (allEpisodes.length <= this.MAX_EPISODES) {
      return {
        activeEpisodes: allEpisodes,
        archivedEpisodes: []
      };
    }

    // 最新の50件をアクティブに、残りをアーカイブに
    const activeEpisodes = allEpisodes.slice(0, this.MAX_EPISODES);
    const newArchivedEpisodes = allEpisodes.slice(this.MAX_EPISODES);

    // 既存のアーカイブを読み込み
    const existingArchived = await this.getArchivedEpisodes();
    const allArchivedEpisodes = [...existingArchived, ...newArchivedEpisodes];

    console.log(`📦 Archiving ${newArchivedEpisodes.length} episodes (${allArchivedEpisodes.length} total archived)`);

    return {
      activeEpisodes,
      archivedEpisodes: allArchivedEpisodes
    };
  }

  /**
   * アーカイブされたエピソードを保存
   */
  private async saveArchivedEpisodes(episodes: RssEpisode[]): Promise<void> {
    try {
      const archiveData = {
        lastUpdated: new Date().toISOString(),
        episodes: episodes.map(ep => ({
          ...ep,
          pubDate: ep.pubDate.toISOString()
        }))
      };
      
      await fs.writeFile(this.archivePath, JSON.stringify(archiveData, null, 2), 'utf8');
      console.log(`💾 Archived ${episodes.length} episodes`);
    } catch (error) {
      console.error('Failed to save archived episodes:', error);
    }
  }

  /**
   * アーカイブされたエピソードを取得
   */
  private async getArchivedEpisodes(): Promise<RssEpisode[]> {
    try {
      const archiveContent = await fs.readFile(this.archivePath, 'utf8');
      const archiveData = JSON.parse(archiveContent);
      
      return archiveData.episodes.map((ep: any) => ({
        ...ep,
        pubDate: new Date(ep.pubDate)
      }));
    } catch (error) {
      // アーカイブファイルが存在しない場合は空配列を返す
      return [];
    }
  }

  /**
   * RSS Feedの統計情報を取得
   */
  async getFeedStats(): Promise<RssFeedStats> {
    try {
      const activeEpisodes = await this.getExistingEpisodes();
      const archivedEpisodes = await this.getArchivedEpisodes();
      
      const totalEpisodes = activeEpisodes.length + archivedEpisodes.length;
      
      return {
        totalEpisodes,
        activeEpisodes: activeEpisodes.length,
        archivedEpisodes: archivedEpisodes.length,
        oldestActiveEpisode: activeEpisodes.length > 0 ? activeEpisodes[activeEpisodes.length - 1].pubDate : null,
        newestActiveEpisode: activeEpisodes.length > 0 ? activeEpisodes[0].pubDate : null
      };
    } catch (error) {
      console.error('Failed to get feed stats:', error);
      return {
        totalEpisodes: 0,
        activeEpisodes: 0,
        archivedEpisodes: 0,
        oldestActiveEpisode: null,
        newestActiveEpisode: null
      };
    }
  }

  /**
   * アーカイブからエピソードを復元（手動操作用）
   */
  async restoreEpisodeFromArchive(episodeId: number): Promise<boolean> {
    try {
      const archivedEpisodes = await this.getArchivedEpisodes();
      const episodeToRestore = archivedEpisodes.find(ep => ep.id === episodeId);
      
      if (!episodeToRestore) {
        console.log(`Episode ${episodeId} not found in archive`);
        return false;
      }

      // 現在のアクティブエピソードを取得
      const activeEpisodes = await this.getExistingEpisodes();
      
      // 復元するエピソードを最新として追加
      const updatedEpisodes = [episodeToRestore, ...activeEpisodes];
      
      // 制限管理を実行
      const { activeEpisodes: newActiveEpisodes, archivedEpisodes: newArchivedEpisodes } = 
        await this.manageEpisodeLimit(updatedEpisodes);

      // フィードを更新
      await this.generateFeed(newActiveEpisodes);
      await this.saveArchivedEpisodes(newArchivedEpisodes);

      console.log(`✅ Restored episode ${episodeId} from archive`);
      return true;
      
    } catch (error) {
      console.error('Failed to restore episode from archive:', error);
      return false;
    }
  }

  /**
   * アーカイブされたエピソードの一覧を取得
   */
  async getArchivedEpisodesList(): Promise<RssEpisode[]> {
    return await this.getArchivedEpisodes();
  }
}

export const rssGenerator = new RssGenerator(); 