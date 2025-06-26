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

export class RssGenerator {
  private feedDir = './public/rss';
  private feedPath = path.join(this.feedDir, 'spotify-feed.xml');
  private baseUrl: string;

  constructor() {
    // Use Replit deployment URL or localhost for development
    this.baseUrl = process.env.REPL_SLUG 
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      : 'http://localhost:5000';
    
    this.ensureFeedDirectory();
  }

  async addEpisodeToFeed(episodeData: {
    title: string;
    description: string;
    filePath: string;
    publishDate: string;
    fileSize: number;
    mimeType: string;
  }): Promise<void> {
    console.log(`📡 Adding episode to RSS feed: ${episodeData.title}`);
    
    try {
      // Generate updated RSS feed
      await this.regenerateFeed();
      console.log(`✅ RSS feed updated with episode: ${episodeData.title}`);
      
    } catch (error) {
      console.error('❌ Failed to add episode to RSS feed:', error);
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
      const fileUrl = `${this.baseUrl}/api/rss/media/${episode.id}`;
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
    <link>${this.baseUrl}/rss/spotify-feed.xml</link>
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

  async addEpisode(uploadId: number): Promise<void> {
    try {
      const upload = await storage.getUpload(uploadId);
      if (!upload) {
        throw new Error(`Upload ${uploadId} not found`);
      }

      // Check if upload is audio format suitable for podcast
      if (!upload.mimeType.startsWith('audio/')) {
        console.log(`Skipping RSS feed update for non-audio file: ${upload.mimeType}`);
        return;
      }

      const episode: RssEpisode = {
        id: upload.id,
        title: upload.title,
        description: upload.description || undefined,
        filePath: upload.processedFilePath || upload.filePath,
        fileSize: upload.fileSize,
        mimeType: upload.mimeType,
        pubDate: upload.createdAt,
        guid: `autopost-${upload.id}-${Date.now()}`,
      };

      // Get existing episodes from RSS feed
      const existingEpisodes = await this.getExistingEpisodes();
      
      // Check if episode already exists
      const episodeExists = existingEpisodes.some(ep => ep.id === upload.id);
      if (episodeExists) {
        console.log(`Episode ${upload.id} already exists in RSS feed`);
        return;
      }

      // Add new episode at the beginning (most recent first)
      const allEpisodes = [episode, ...existingEpisodes];
      
      // Limit to latest 50 episodes
      const limitedEpisodes = allEpisodes.slice(0, 50);

      await this.generateFeed(limitedEpisodes);
      console.log(`✅ RSS feed updated with episode: ${upload.title}`);
      
    } catch (error) {
      console.error('Failed to add episode to RSS feed:', error);
      throw error;
    }
  }

  private async getExistingEpisodes(): Promise<RssEpisode[]> {
    try {
      // Get all completed uploads that are audio files
      const uploads = await storage.getAllUploads();
      const audioUploads = uploads.filter(upload => 
        upload.mimeType.startsWith('audio/') && 
        upload.status === 'completed'
      );

      return audioUploads.map(upload => ({
        id: upload.id,
        title: upload.title,
        description: upload.description || undefined,
        filePath: upload.processedFilePath || upload.filePath,
        fileSize: upload.fileSize,
        mimeType: upload.mimeType,
        pubDate: upload.createdAt,
        guid: `autopost-${upload.id}-${upload.createdAt.getTime()}`,
      })).sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
      
    } catch (error) {
      console.error('Failed to get existing episodes:', error);
      return [];
    }
  }

  private async generateFeed(episodes: RssEpisode[]): Promise<void> {
    try {
      const rssXml = this.generateRssXml(episodes);
      await fs.writeFile(this.feedPath, rssXml, 'utf8');
      console.log(`RSS feed generated: ${this.feedPath}`);
    } catch (error) {
      console.error('Failed to generate RSS feed:', error);
      throw error;
    }
  }

  async regenerateFeed(): Promise<void> {
    try {
      const episodes = await this.getExistingEpisodes();
      await this.generateFeed(episodes);
      console.log('RSS feed regenerated successfully');
    } catch (error) {
      console.error('Failed to regenerate RSS feed:', error);
      throw error;
    }
  }

  getFeedUrl(): string {
    return `${this.baseUrl}/rss/spotify-feed.xml`;
  }

  getFeedPath(): string {
    return this.feedPath;
  }
}

export const rssGenerator = new RssGenerator();