import { google, youtube_v3 } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import fs from 'fs'
import path from 'path'

export interface YoutubeUploadOptions {
  accessToken: string
  refreshToken: string
  clientId: string
  clientSecret: string
  title: string
  description?: string
  tags?: string[]
  categoryId?: string
  privacyStatus?: 'private' | 'public' | 'unlisted'
  filePath: string
  mimeType?: string
}

export interface YoutubeAuthResponse {
  access_token: string
  refresh_token: string
}

export class YouTubeClient {
  private oauth2Client: OAuth2Client
  private youtube: any

  constructor() {
    this.oauth2Client = new google.auth.OAuth2()
    this.youtube = google.youtube({
      version: 'v3',
      auth: this.oauth2Client,
    })
  }

  setCredentials(clientId: string, clientSecret: string) {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_APP_URL || 'https://blogpostplatform-production.up.railway.app'
      : 'http://localhost:3000'
    
    const redirectUri = `${baseUrl}/api/platforms/youtube/callback`
    
    console.log('=== YouTube OAuth Configuration ===')
    console.log('Environment:', process.env.NODE_ENV)
    console.log('Base URL:', baseUrl)
    console.log('Redirect URI:', redirectUri)
    console.log('Client ID:', clientId ? '***' + clientId.slice(-4) : 'missing')
    console.log('Client Secret:', clientSecret ? '***' + clientSecret.slice(-4) : 'missing')
    console.log('====================================')
    
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    )
  }

  generateAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.force-ssl'
    ]

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    })

    console.log('=== YouTube Auth URL Generation ===')
    console.log('Scopes:', scopes)
    console.log('Access type: offline')
    console.log('Prompt: consent')
    console.log('Generated URL:', authUrl)
    console.log('===================================')

    return authUrl
  }

  async handleAuthCallback(code: string): Promise<YoutubeAuthResponse> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code)
      
      if (!tokens || !tokens.refresh_token) {
        throw new Error('No refresh token received. Please revoke access and try again.')
      }

      this.oauth2Client.setCredentials(tokens)

      return {
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token,
      }
    } catch (error: any) {
      console.error('YouTube auth callback error:', error)
      throw new Error(`Authentication failed: ${error.message}`)
    }
  }

  async uploadToYoutube(options: YoutubeUploadOptions): Promise<youtube_v3.Schema$Video> {
    console.log('=== YouTubeClient.uploadToYoutube Debug ===')
    console.log('Upload options received:', {
      hasAccessToken: !!options.accessToken,
      hasRefreshToken: !!options.refreshToken,
      hasClientId: !!options.clientId,
      hasClientSecret: !!options.clientSecret,
      title: options.title,
      filePath: options.filePath,
      mimeType: options.mimeType,
      privacyStatus: options.privacyStatus
    })
    
    try {
      // Create a new OAuth2Client instance for this upload to ensure clean state
      const baseUrl = process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_APP_URL || 'https://blogpostplatform-production.up.railway.app'
        : 'http://localhost:3000'
      
      const redirectUri = `${baseUrl}/api/platforms/youtube/callback`
      
      console.log('Creating OAuth2Client with:', {
        clientId: options.clientId ? '***' : 'missing',
        clientSecret: options.clientSecret ? '***' : 'missing',
        redirectUri: redirectUri
      })
      
      const oauth2Client = new google.auth.OAuth2(
        options.clientId,
        options.clientSecret,
        redirectUri
      )
      
      // Set credentials with refresh token
      console.log('Setting OAuth credentials with refresh token')
      oauth2Client.setCredentials({
        refresh_token: options.refreshToken,
      })

      // Create a new YouTube API instance with the properly configured OAuth client
      console.log('Creating YouTube API instance')
      const youtube = google.youtube({
        version: 'v3',
        auth: oauth2Client,
      })

      const requestBody = {
        snippet: {
          title: options.title,
          description: options.description,
          tags: options.tags,
          categoryId: this.getCategoryId(options.categoryId),
        },
        status: {
          privacyStatus: options.privacyStatus || 'private',
        },
      }

      console.log('Request body prepared:', {
        title: requestBody.snippet.title,
        descriptionLength: requestBody.snippet.description?.length || 0,
        tagsCount: requestBody.snippet.tags?.length || 0,
        categoryId: requestBody.snippet.categoryId,
        privacyStatus: requestBody.status.privacyStatus
      })

      const media = {
        mimeType: options.mimeType || 'audio/mpeg',
        body: fs.createReadStream(options.filePath),
      }

      console.log('Media configuration:', {
        mimeType: media.mimeType,
        filePath: options.filePath
      })

      console.log('Starting YouTube API call...')
      const response = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody,
        media,
      })

      console.log('YouTube API response received:', {
        hasData: !!response.data,
        videoId: response.data?.id,
        uploadStatus: response.data?.status?.uploadStatus,
        privacyStatus: response.data?.status?.privacyStatus,
        failureReason: response.data?.status?.failureReason
      })

      // Check the actual processing status from YouTube
      const videoId = response.data.id!
      const videoStatus = response.data.status
      
      console.log(`YouTube upload response:`, {
        videoId,
        uploadStatus: videoStatus?.uploadStatus,
        privacyStatus: videoStatus?.privacyStatus,
        failureReason: videoStatus?.failureReason
      })

      return response.data
    } catch (error: any) {
      console.error('YouTube upload error in client:', {
        error: error.message,
        code: error.code,
        status: error.status,
        stack: error.stack?.substring(0, 500) // 最初の500文字のみ
      })
      
      // Google API エラーの詳細情報をログ出力
      if (error.response) {
        console.error('Google API error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        })
      }
      
      throw new Error(`YouTube upload failed: ${error.message}`)
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
    }
    return categoryMap[category?.toLowerCase() || ''] || categoryMap.default
  }

  async getChannelInfo(refreshToken: string, clientId: string, clientSecret: string): Promise<any> {
    try {
      const baseUrl = process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_APP_URL || 'https://blogpostplatform-production.up.railway.app'
        : 'http://localhost:3000'
      
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        `${baseUrl}/api/platforms/youtube/callback`
      )

      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      })

      const youtube = google.youtube({
        version: 'v3',
        auth: oauth2Client,
      })

      const response = await youtube.channels.list({
        part: ['snippet', 'statistics'],
        mine: true,
      })

      return response.data.items?.[0]
    } catch (error: any) {
      console.error('YouTube channel info error:', error)
      throw new Error(`Failed to get channel info: ${error.message}`)
    }
  }

  async revokeAccess(refreshToken: string, clientId: string, clientSecret: string): Promise<void> {
    try {
      const baseUrl = process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_APP_URL || 'https://blogpostplatform-production.up.railway.app'
        : 'http://localhost:3000'
      
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        `${baseUrl}/api/platforms/youtube/callback`
      )

      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      })
      
      await oauth2Client.revokeCredentials()
    } catch (error: any) {
      console.error('YouTube revoke access error:', error)
      throw new Error(`Failed to revoke access: ${error.message}`)
    }
  }
}

// シングルトンインスタンス
export const youtubeClient = new YouTubeClient()

// 後方互換性のための関数
export async function uploadToYoutube(options: YoutubeUploadOptions): Promise<youtube_v3.Schema$Video> {
  return youtubeClient.uploadToYoutube(options)
}

export async function getYoutubeVideoInfo(videoId: string, accessToken: string) {
  const youtube = google.youtube({ version: 'v3', auth: accessToken })
  const res = await youtube.videos.list({
    part: ['snippet', 'status', 'contentDetails'],
    id: [videoId],
  })
  return res.data.items?.[0]
} 