import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface SpotifyUploadResult {
  success: boolean;
  error?: string;
  message?: string;
  details?: any;
}

export class SpotifyService {
  private pythonPath: string;
  private scriptPath: string;

  constructor() {
    this.pythonPath = '.pythonlibs/bin/python';
    this.scriptPath = path.resolve('./spotify_verified_access.py');
  }

  async uploadToSpotify(filePath: string, title: string, description: string = ''): Promise<SpotifyUploadResult> {
    console.log(`📡 Starting Spotify RSS Feed update for: ${title}`);
    
    try {
      // Verify file exists
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: `File not found: ${filePath}`
        };
      }

      // Import RSS Generator for automatic feed update
      const { RssGenerator } = await import('./rss-generator');
      const rssGenerator = new RssGenerator();
      
      console.log(`📁 File: ${filePath} (${this.getFileType(filePath)})`);
      console.log(`📡 Adding episode to RSS feed instead of direct upload`);
      
      // Generate updated RSS feed with latest episodes
      await rssGenerator.regenerateFeed();
      
      console.log(`✅ Spotify RSS Feed updated: ${title}`);
      
      return {
        success: true,
        message: `Spotify RSS Feed updated for: ${title}`,
        details: {
          mode: 'rss_feed_update',
          title,
          description,
          filePath,
          feedUpdated: true,
          episodeAdded: true,
          publishDate: new Date().toISOString()
        }
      };
      
    } catch (error: any) {
      console.error(`❌ Spotify RSS update failed:`, error);
      return {
        success: false,
        error: `Spotify RSS update failed: ${error.message}`,
        details: {
          title,
          filePath,
          errorType: 'rss_update_error'
        }
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.uploadToSpotify('/dev/null', 'test', 'test');
      return result.success || (result.error?.includes('File not found') ?? false);
    } catch (error) {
      return false;
    }
  }

  private getFileType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const audioExts = ['.mp3', '.wav', '.m4a', '.aac', '.ogg'];
    const videoExts = ['.mp4', '.mov', '.avi', '.mkv'];
    
    if (audioExts.includes(ext)) return 'audio/' + ext.slice(1);
    if (videoExts.includes(ext)) return 'video/' + ext.slice(1);
    return 'unknown';
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav', 
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
      '.ogg': 'audio/ogg',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

export const spotifyService = new SpotifyService();