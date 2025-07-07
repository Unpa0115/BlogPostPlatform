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
    this.baseUrl = this.getBaseUrl();
  }

  private getBaseUrl(): string {
    const nodeEnv = process.env.NODE_ENV;
    const isLocalhost = process.env.LOCALHOST_RSS_ENABLED === 'true';
    
    if (nodeEnv === 'development' && isLocalhost) {
      // localhost環境でGitHub PagesのRSS Feed URL
      return 'https://yujiyamanaka.github.io/BlogPostPlatform';
    } else {
      // Railway環境では従来通り
      return process.env.NEXT_PUBLIC_APP_URL || 'https://blogpostplatform-production.up.railway.app';
    }
  }

  private getMediaUrl(episodeId: number): string {
    const nodeEnv = process.env.NODE_ENV;
    const isLocalhost = process.env.LOCALHOST_RSS_ENABLED === 'true';
    
    if (nodeEnv === 'development' && isLocalhost) {
      // localhost環境ではGitHub PagesのファイルURL
      return `${this.baseUrl}/uploads/${episodeId}.mp3`;
    } else {
      // Railway環境ではAPI経由
      return `${this.baseUrl}/api/uploads/${episodeId}`;
    }
  }

  // ファイル名からUUIDを取得するマッピング機能
  private async getUploadIdByFileName(fileName: string, userId: string): Promise<string | null> {
    try {
      // 全アップロードを取得してファイル名で検索
      const allUploads = await storage.getAllUploads();
      const upload = allUploads.find(upload => 
        upload.file_path.includes(fileName) && upload.user_id === userId
      );
      
      return upload?.id || null;
    } catch (error) {
      console.error(`Failed to get upload ID for file ${fileName}:`, error);
      return null;
    }
  }

  // UUIDからファイル名を取得するマッピング機能
  private async getFileNameByUploadId(uploadId: string): Promise<string | null> {
    try {
      const upload = await storage.getUpload(uploadId);
      return upload ? path.basename(upload.file_path) : null;
    } catch (error) {
      console.error(`Failed to get file name for upload ID ${uploadId}:`, error);
      return null;
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
    await this.ensureFeedDirectory();
    
    const episode: RssEpisode = {
      id: Date.now(), // タイムスタンプベースのID
      title: episodeData.title,
      description: episodeData.description,
      filePath: episodeData.filePath,
      fileSize: episodeData.fileSize,
      mimeType: episodeData.mimeType,
      pubDate: new Date(episodeData.publishDate),
      guid: `autopost-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    const existingEpisodes = await this.getExistingEpisodes();
    const allEpisodes = [episode, ...existingEpisodes];
    
    const { activeEpisodes, archivedEpisodes } = await this.manageEpisodeLimit(allEpisodes);
    await this.generateFeed(activeEpisodes);
    await this.saveArchivedEpisodes(archivedEpisodes);
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
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
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
      const mediaUrl = this.getMediaUrl(episode.id);
      return `    <item>
      <title>${this.escapeXml(episode.title)}</title>
      <link>${mediaUrl}</link>
      <description>${this.escapeXml(episode.description || '')}</description>
      <pubDate>${episode.pubDate.toUTCString()}</pubDate>
      <guid>${episode.guid}</guid>
      <enclosure url="${mediaUrl}" length="${episode.fileSize}" type="${episode.mimeType}" />
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

  // ファイル名またはUUIDでエピソードを追加（統一インターフェース）
  async addEpisode(identifier: string, userId?: string): Promise<void> {
    try {
      console.log(`🔍 Adding episode to RSS feed: ${identifier}`);
      console.log(`🔍 Identifier type: ${typeof identifier}`);
      console.log(`🔍 Identifier value: ${identifier}`);
      
      let uploadId: string;
      
      // ファイル名かUUIDかを判定
      if (identifier.includes('.mp3') || identifier.includes('.wav') || identifier.includes('.m4a')) {
        // ファイル名の場合、UUIDを取得
        if (!userId) {
          throw new Error('User ID is required when using file name as identifier');
        }
        
        console.log(`📁 File name detected, looking up UUID for: ${identifier}`);
        const foundUploadId = await this.getUploadIdByFileName(identifier, userId);
        
        if (!foundUploadId) {
          throw new Error(`No upload found for file: ${identifier}`);
        }
        
        uploadId = foundUploadId;
        console.log(`✅ Found UUID: ${uploadId} for file: ${identifier}`);
      } else {
        // UUIDの場合、そのまま使用
        uploadId = identifier;
        console.log(`✅ Using UUID directly: ${uploadId}`);
      }
      
      // データベースからアップロード情報を取得
      const upload = await storage.getUpload(uploadId);
      console.log(`📋 Upload data:`, upload);
      
      if (!upload) {
        console.error(`❌ Upload not found in database: ${uploadId}`);
        
        // データベース内の全アップロードを確認
        try {
          const allUploads = await storage.getAllUploads();
          console.log(`📊 Total uploads in database: ${allUploads.length}`);
          console.log(`📊 Upload IDs in database:`, allUploads.map(u => u.id).slice(0, 10));
        } catch (dbError) {
          console.error(`❌ Failed to check database for uploads:`, dbError);
        }
        
        throw new Error(`Upload ${uploadId} not found`);
      }

      // Check if upload is audio format suitable for podcast
      if (!upload.mime_type.startsWith('audio/')) {
        console.log(`Skipping RSS feed update for non-audio file: ${upload.mime_type}`);
        return;
      }

      // UUIDをハッシュ値に変換
      const episodeId = this.generateEpisodeId(upload.id);
      console.log(`🆔 Generated episode ID: ${episodeId} from UUID: ${upload.id}`);

      const episode: RssEpisode = {
        id: episodeId,
        title: upload.title,
        description: upload.description || undefined,
        filePath: upload.processed_file_path || upload.file_path,
        fileSize: upload.file_size,
        mimeType: upload.mime_type,
        pubDate: upload.created_at instanceof Date 
          ? upload.created_at 
          : typeof upload.created_at === 'number'
          ? new Date(upload.created_at)
          : new Date(upload.created_at),
        guid: `autopost-${upload.id}-${Date.now()}`,
      };

      console.log(`📝 Episode data:`, episode);

      // Get existing episodes from RSS feed
      const existingEpisodes = await this.getExistingEpisodes();
      console.log(`📚 Found ${existingEpisodes.length} existing episodes`);
      
      // Check if episode already exists
      const episodeExists = existingEpisodes.some(ep => ep.guid === episode.guid);
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
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
        identifier: identifier
      });
      throw error;
    }
  }

  // UUIDから一意の数値IDを生成
  private generateEpisodeId(uuid: string): number {
    // UUIDをハッシュ値に変換
    const hash = uuid.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return Math.abs(hash);
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
          : typeof upload.created_at === 'number'
          ? new Date(upload.created_at)
          : new Date(upload.created_at);
        
        // UUIDからエピソードIDを生成
        const episodeId = this.generateEpisodeId(upload.id);
        
        return {
          id: episodeId,
          title: upload.title,
          description: upload.description || undefined,
          filePath: upload.processed_file_path || upload.file_path,
          fileSize: upload.file_size,
          mimeType: upload.mime_type,
          pubDate: pubDate,
          guid: `autopost-${upload.id}-${pubDate.getTime()}`,
        };
      });
      
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

    // 最新のエピソードをアクティブに、古いものをアーカイブに
    const activeEpisodes = allEpisodes.slice(0, this.MAX_EPISODES);
    const archivedEpisodes = allEpisodes.slice(this.MAX_EPISODES);

    console.log(`📊 Episode limit reached: ${allEpisodes.length} total, ${activeEpisodes.length} active, ${archivedEpisodes.length} archived`);

    return { activeEpisodes, archivedEpisodes };
  }

  private async saveArchivedEpisodes(episodes: RssEpisode[]): Promise<void> {
    if (episodes.length === 0) return;

    try {
      const existingArchived = await this.getArchivedEpisodes();
      const allArchived = [...existingArchived, ...episodes];
      
      await fs.writeFile(this.archivePath, JSON.stringify(allArchived, null, 2), 'utf8');
      console.log(`📦 Archived ${episodes.length} episodes`);
    } catch (error) {
      console.error('Failed to save archived episodes:', error);
    }
  }

  private async getArchivedEpisodes(): Promise<RssEpisode[]> {
    try {
      const data = await fs.readFile(this.archivePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  async getFeedStats(): Promise<RssFeedStats> {
    try {
      const activeEpisodes = await this.getExistingEpisodes();
      const archivedEpisodes = await this.getArchivedEpisodes();
      
      const allEpisodes = [...activeEpisodes, ...archivedEpisodes];
      
      return {
        totalEpisodes: allEpisodes.length,
        activeEpisodes: activeEpisodes.length,
        archivedEpisodes: archivedEpisodes.length,
        oldestActiveEpisode: activeEpisodes.length > 0 ? 
          activeEpisodes[activeEpisodes.length - 1].pubDate : null,
        newestActiveEpisode: activeEpisodes.length > 0 ? 
          activeEpisodes[0].pubDate : null,
      };
    } catch (error) {
      console.error('Failed to get feed stats:', error);
      return {
        totalEpisodes: 0,
        activeEpisodes: 0,
        archivedEpisodes: 0,
        oldestActiveEpisode: null,
        newestActiveEpisode: null,
      };
    }
  }

  async restoreEpisodeFromArchive(episodeId: number): Promise<boolean> {
    try {
      const archivedEpisodes = await this.getArchivedEpisodes();
      const episodeToRestore = archivedEpisodes.find(ep => ep.id === episodeId);
      
      if (!episodeToRestore) {
        return false;
      }

      // アーカイブから削除
      const updatedArchived = archivedEpisodes.filter(ep => ep.id !== episodeId);
      await fs.writeFile(this.archivePath, JSON.stringify(updatedArchived, null, 2), 'utf8');

      // アクティブエピソードに追加
      await this.addEpisode(episodeToRestore.guid.split('-')[1]); // UUID部分を抽出
      
      console.log(`✅ Restored episode ${episodeId} from archive`);
      return true;
    } catch (error) {
      console.error('Failed to restore episode from archive:', error);
      return false;
    }
  }

  async getArchivedEpisodesList(): Promise<RssEpisode[]> {
    return await this.getArchivedEpisodes();
  }
}

export const rssGenerator = new RssGenerator(); 