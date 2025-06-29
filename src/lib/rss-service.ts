import { storage } from './storage';
import path from 'path';
import fs from 'fs';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

export interface RssItem {
  title: string;
  description?: string;
  enclosure?: {
    url: string;
    type?: string;
    length?: number;
  };
  guid: string;
  pubDate?: Date;
}

export interface RssFeedData {
  title: string;
  description?: string;
  items: RssItem[];
}

export class RssService {
  private downloadDir = './rss_downloads';

  constructor() {
    // Ensure download directory exists
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  async fetchRssFeed(url: string): Promise<RssFeedData> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.statusText}`);
    }

    const xmlText = await response.text();
    return this.parseRssXml(xmlText);
  }

  private parseRssXml(xmlText: string): RssFeedData {
    // Simple XML parsing for RSS feeds
    const items: RssItem[] = [];
    
    // Extract channel title and description
    const channelTitleMatch = xmlText.match(/<title[^>]*>(.*?)<\/title>/i);
    const channelDescMatch = xmlText.match(/<description[^>]*>(.*?)<\/description>/i);
    
    const feedTitle = channelTitleMatch ? this.decodeHtmlEntities(channelTitleMatch[1]) : 'Unknown Feed';
    const feedDescription = channelDescMatch ? this.decodeHtmlEntities(channelDescMatch[1]) : undefined;

    // Extract all items using a simpler approach
    const itemStartRegex = /<item[^>]*>/gi;
    const itemEndRegex = /<\/item>/gi;
    let startMatch;
    const items_found: string[] = [];
    
    while ((startMatch = itemStartRegex.exec(xmlText)) !== null) {
      itemEndRegex.lastIndex = startMatch.index;
      const endMatch = itemEndRegex.exec(xmlText);
      if (endMatch) {
        const itemXml = xmlText.substring(startMatch.index + startMatch[0].length, endMatch.index);
        items_found.push(itemXml);
      }
    }
    
    for (const itemXml of items_found) {
      
      const titleMatch = itemXml.match(/<title[^>]*>(.*?)<\/title>/i);
      const descMatch = itemXml.match(/<description[^>]*>(.*?)<\/description>/i);
      const guidMatch = itemXml.match(/<guid[^>]*>(.*?)<\/guid>/i);
      const pubDateMatch = itemXml.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i);
      const enclosureMatch = itemXml.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*(?:type=["']([^"']+)["'])?[^>]*(?:length=["']([^"']+)["'])?[^>]*\/?>/i);

      if (titleMatch && guidMatch) {
        const item: RssItem = {
          title: this.decodeHtmlEntities(titleMatch[1]),
          description: descMatch ? this.decodeHtmlEntities(descMatch[1]) : undefined,
          guid: guidMatch[1],
          pubDate: pubDateMatch ? new Date(pubDateMatch[1]) : undefined,
        };

        if (enclosureMatch) {
          item.enclosure = {
            url: enclosureMatch[1],
            type: enclosureMatch[2] || undefined,
            length: enclosureMatch[3] ? parseInt(enclosureMatch[3]) : undefined,
          };
        }

        items.push(item);
      }
    }

    return {
      title: feedTitle,
      description: feedDescription,
      items
    };
  }

  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");
  }

  async downloadEpisode(url: string, filename: string): Promise<{ filePath: string; fileSize: number; mimeType: string }> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download episode: ${response.statusText}`);
    }

    const filePath = path.join(this.downloadDir, filename);
    const fileStream = createWriteStream(filePath);
    
    if (!response.body) {
      throw new Error('No response body');
    }

    await pipeline(Readable.fromWeb(response.body as any), fileStream);
    
    const stats = fs.statSync(filePath);
    const mimeType = response.headers.get('content-type') || 'application/octet-stream';

    return {
      filePath,
      fileSize: stats.size,
      mimeType
    };
  }

  async checkForNewEpisodes(feedId: string): Promise<void> {
    const feed = await storage.getRssFeed(feedId);
    if (!feed || !feed.is_active) return;

    console.log(`Checking RSS feed: ${feed.feed_name}`);

    try {
      const feedData = await this.fetchRssFeed(feed.feed_url);
      const existingGuids = await storage.getRssEpisodeGuids(feedId);

      for (const item of feedData.items) {
        if (item.enclosure && !existingGuids.includes(item.guid)) {
          console.log(`New episode found: ${item.title}`);
          
          // Create episode record
          const episode = await storage.createRssEpisode({
            feed_id: feedId,
            title: item.title,
            description: item.description,
            enclosure_url: item.enclosure.url,
            enclosure_type: item.enclosure.type,
            enclosure_length: item.enclosure.length,
            guid: item.guid,
            pub_date: item.pubDate,
            download_status: 'pending'
          });

          // Start download in background
          this.downloadEpisodeInBackground(episode.id, item.enclosure.url, item.title);
        }
      }

      // Update last checked timestamp
      await storage.updateRssFeed(feedId, { last_checked: new Date() } as Partial<any>);

    } catch (error) {
      console.error(`Error checking RSS feed ${feed.feed_name}:`, error);
    }
  }

  private async downloadEpisodeInBackground(episodeId: string, url: string, title: string): Promise<void> {
    try {
      await storage.updateRssEpisode(episodeId, { download_status: 'downloading' });
      
      const sanitizedTitle = title.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
      const extension = this.getFileExtension(url);
      const filename = `${episodeId}_${sanitizedTitle}${extension}`;
      
      const { filePath, fileSize, mimeType } = await this.downloadEpisode(url, filename);
      
      await storage.updateRssEpisode(episodeId, {
        download_status: 'completed',
        local_file_path: filePath,
        file_size: fileSize,
        mime_type: mimeType
      });

      console.log(`Episode downloaded: ${title} -> ${filePath}`);
      
    } catch (error) {
      console.error(`Failed to download episode ${title}:`, error);
      await storage.updateRssEpisode(episodeId, { 
        download_status: 'failed' 
      });
    }
  }

  private getFileExtension(url: string): string {
    const parts = url.split('.');
    return '.' + parts[parts.length - 1];
  }
}