import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import { storage } from './storage';

export interface YouTubeUploadMetadata {
  title: string;
  description: string;
  tags?: string[];
  category?: string;
  visibility?: 'private' | 'unlisted' | 'public';
  thumbnailPath?: string;
}

export interface YouTubeUploadResult {
  success: boolean;
  videoId?: string;
  status?: string;
  error?: string;
  details?: any;
}

export class YouTubeService {
  private oauth2Client: OAuth2Client;
  private youtube: any;
  private clientId: string | null = null;
  private clientSecret: string | null = null;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2();
    this.youtube = google.youtube({
      version: 'v3',
      auth: this.oauth2Client,
    });
  }

  setCredentials(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    
    // Next.js環境でのコールバックURL設定
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_APP_URL || 'https://blogpostplatform-production.up.railway.app'
      : 'http://localhost:3000';
    
    const redirectUri = `${baseUrl}/api/platforms/youtube/callback`
    
    console.log('=== YouTube Service OAuth Configuration ===')
    console.log('Environment:', process.env.NODE_ENV)
    console.log('Base URL:', baseUrl)
    console.log('Redirect URI:', redirectUri)
    console.log('==========================================')
    
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
  }

  generateAuthUrl(): string {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('YouTube credentials not configured');
    }

    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  async handleAuthCallback(code: string): Promise<{ access_token: string; refresh_token: string }> {
    try {
      if (!this.clientId || !this.clientSecret) {
        throw new Error('YouTube credentials not configured');
      }

      const { tokens } = await this.oauth2Client.getToken(code);
      
      if (!tokens || !tokens.refresh_token) {
        throw new Error('No refresh token received. Please revoke access and try again.');
      }

      this.oauth2Client.setCredentials(tokens);

      // Store refresh token in platform settings
      const currentSettings = await storage.getPlatformSettings('youtube');
      await storage.updatePlatformSettings('youtube', {
        settings: {
          clientId: currentSettings?.settings?.clientId || this.clientId!,
          clientSecret: currentSettings?.settings?.clientSecret || this.clientSecret!,
          refreshToken: tokens.refresh_token,
        },
        is_active: true,
      });

      return {
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token,
      };
    } catch (error: any) {
      console.error('YouTube auth callback error:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  async uploadVideo(filePath: string, metadata: YouTubeUploadMetadata): Promise<YouTubeUploadResult> {
    try {
      const platformSettings = await storage.getPlatformSettings('youtube');
      if (!platformSettings?.settings?.refreshToken) {
        throw new Error('YouTube not authenticated. Please complete OAuth flow first.');
      }

      // Ensure OAuth2Client is properly configured with credentials
      if (!platformSettings.settings.clientId || !platformSettings.settings.clientSecret) {
        throw new Error('YouTube client credentials not configured.');
      }

      // Create a new OAuth2Client instance for this upload to ensure clean state
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? process.env.NEXT_PUBLIC_APP_URL || 'https://blogpostplatform-production.up.railway.app'
        : 'http://localhost:3000';

      const redirectUri = `${baseUrl}/api/platforms/youtube/callback`

      const oauth2Client = new google.auth.OAuth2(
        platformSettings.settings.clientId,
        platformSettings.settings.clientSecret,
        redirectUri
      );
      
      // Set credentials with refresh token
      oauth2Client.setCredentials({
        refresh_token: platformSettings.settings.refreshToken,
      });

      // Create a new YouTube API instance with the properly configured OAuth client
      const youtube = google.youtube({
        version: 'v3',
        auth: oauth2Client,
      });

      const requestBody = {
        snippet: {
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags,
          categoryId: this.getCategoryId(metadata.category),
        },
        status: {
          privacyStatus: metadata.visibility || 'private',
        },
      };

      const media = {
        mimeType: 'video/*',
        body: fs.createReadStream(filePath),
      };

      const response = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody,
        media,
      });

      // Check the actual processing status from YouTube
      const videoId = response.data.id!;
      const videoStatus = response.data.status;
      
      console.log(`YouTube upload response:`, {
        videoId,
        uploadStatus: videoStatus?.uploadStatus,
        privacyStatus: videoStatus?.privacyStatus,
        failureReason: videoStatus?.failureReason
      });

      return {
        success: true,
        videoId,
        status: 'uploaded',
        details: {
          uploadStatus: videoStatus?.uploadStatus,
          privacyStatus: videoStatus?.privacyStatus
        }
      };
    } catch (error: any) {
      console.error('YouTube upload error:', error);
      return {
        success: false,
        error: `YouTube upload failed: ${error.message}`,
        details: {
          errorType: 'upload_error',
          errorCode: error.code,
          errorMessage: error.message
        }
      };
    }
  }

  private getCategoryId(category?: string): string {
    const categoryMap: { [key: string]: string } = {
      'gaming': '20',
      'music': '10',
      'education': '27',
      'entertainment': '24',
      'news': '25',
      'tech': '28',
      'sports': '17',
      'travel': '19',
      'default': '22', // People & Blogs
    };
    const categoryKey = category?.toLowerCase();
    return categoryKey && categoryMap[categoryKey] ? categoryMap[categoryKey] : categoryMap.default;
  }

  async getChannelInfo(): Promise<any> {
    try {
      const platformSettings = await storage.getPlatformSettings('youtube');
      if (!platformSettings?.settings?.refreshToken) {
        throw new Error('YouTube not authenticated');
      }

      this.oauth2Client.setCredentials({
        refresh_token: platformSettings.settings.refreshToken,
      });

      const response = await this.youtube.channels.list({
        part: ['snippet', 'statistics'],
        mine: true,
      });

      return response.data.items[0];
    } catch (error: any) {
      console.error('YouTube channel info error:', error);
      throw new Error(`Failed to get channel info: ${error.message}`);
    }
  }

  async revokeAccess(): Promise<void> {
    try {
      const platformSettings = await storage.getPlatformSettings('youtube');
      if (platformSettings?.settings?.refreshToken) {
        this.oauth2Client.setCredentials({
          refresh_token: platformSettings.settings.refreshToken,
        });
        await this.oauth2Client.revokeCredentials();
      }

      await storage.updatePlatformSettings('youtube', {
        settings: {
          clientId: platformSettings?.settings?.clientId,
          clientSecret: platformSettings?.settings?.clientSecret,
          refreshToken: '',
        },
        is_active: false,
      });
    } catch (error: any) {
      console.error('YouTube revoke access error:', error);
      throw new Error(`Failed to revoke access: ${error.message}`);
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const platformSettings = await storage.getPlatformSettings('youtube');
      if (!platformSettings?.settings?.refreshToken) {
        return {
          success: false,
          error: 'YouTube not authenticated. Please complete OAuth flow first.'
        };
      }

      // Test by getting channel info
      await this.getChannelInfo();
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const youtubeService = new YouTubeService(); 