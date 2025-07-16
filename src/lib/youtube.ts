import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import fs from 'fs'
import path from 'path'

// 環境変数の設定
const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID?.replace(/\s/g, '') // すべての空白文字を除去
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET?.replace(/\s/g, '') // すべての空白文字を除去
const REDIRECT_URI = process.env.NODE_ENV === 'production' 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/youtube/callback`
      : 'http://localhost:3005/api/youtube/callback'

// OAuth2クライアント設定
const oauth2Client = new OAuth2Client(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
)

// YouTube API設定
const youtubeApi = google.youtube({
  version: 'v3',
  auth: oauth2Client
})

export interface YouTubeCredentials {
  clientId: string
  clientSecret: string
  refreshToken?: string
  accessToken?: string
  expiresAt?: number
}

export interface YouTubeUploadOptions {
  title: string
  description?: string
  tags?: string[]
  categoryId?: string
  privacyStatus?: 'private' | 'public' | 'unlisted'
  filePath: string
  mimeType?: string
  credentials: YouTubeCredentials
}

export class YouTube {
  /**
   * YouTube認証URLを生成
   */
  static generateAuthUrl(): string {
    console.log('=== YouTube generateAuthUrl Debug ===')
    console.log('CLIENT_ID exists:', !!CLIENT_ID)
    console.log('CLIENT_SECRET exists:', !!CLIENT_SECRET)
    console.log('REDIRECT_URI:', REDIRECT_URI)
    console.log('Environment:', process.env.NODE_ENV)
    
    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error('Missing credentials:')
      console.error('- CLIENT_ID:', CLIENT_ID ? 'SET' : 'NOT SET')
      console.error('- CLIENT_SECRET:', CLIENT_SECRET ? 'SET' : 'NOT SET')
      throw new Error('YouTube client credentials not configured')
    }

    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.force-ssl'
    ]

    console.log('Scopes:', scopes)
    console.log('OAuth2Client config:', {
      clientId: CLIENT_ID.substring(0, 10) + '...',
      clientSecret: CLIENT_SECRET.substring(0, 10) + '...',
      redirectUri: REDIRECT_URI
    })

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent' // 必ずrefresh_tokenを取得
    })

    console.log('Generated Auth URL:', authUrl)
    return authUrl
  }

  /**
   * 認証コードをトークンに交換
   */
  static async exchangeCodeForTokens(code: string): Promise<YouTubeCredentials> {
    try {
      const { tokens } = await oauth2Client.getToken(code)
      
      if (!tokens.refresh_token) {
        throw new Error('Refresh token not received')
      }

      return {
        clientId: CLIENT_ID!,
        clientSecret: CLIENT_SECRET!,
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token || undefined,
        expiresAt: tokens.expiry_date || undefined
      }
    } catch (error) {
      console.error('YouTube token exchange error:', error)
      throw new Error('Failed to exchange code for tokens')
    }
  }

  /**
   * 動画をYouTubeにアップロード
   */
  static async uploadVideo(options: YouTubeUploadOptions): Promise<any> {
    try {
      const { credentials, filePath, title, description, tags, categoryId, privacyStatus, mimeType } = options

      // トークンを設定
      oauth2Client.setCredentials({
        refresh_token: credentials.refreshToken,
        access_token: credentials.accessToken
      })

      // ファイルの存在確認
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`)
      }

      const fileStats = fs.statSync(filePath)
      console.log(`Uploading file: ${filePath}, size: ${fileStats.size} bytes`)

      // 動画メタデータ
      const videoMetadata = {
        snippet: {
          title: title || 'Untitled Video',
          description: description || '',
          tags: tags || [],
          categoryId: categoryId || '22' // People & Blogs
        },
        status: {
          privacyStatus: privacyStatus || 'private'
        }
      }

      // 動画アップロード
      const uploadResult = await youtubeApi.videos.insert({
        part: ['snippet', 'status'],
        requestBody: videoMetadata,
        media: {
          mimeType: mimeType || 'video/mp4',
          body: fs.createReadStream(filePath)
        }
      })

      console.log('YouTube upload successful:', uploadResult.data.id)
      return uploadResult.data

    } catch (error) {
      console.error('YouTube upload error:', error)
      throw new Error(`YouTube upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * トークンの有効性を確認
   */
  static async validateToken(credentials: YouTubeCredentials): Promise<boolean> {
    try {
      oauth2Client.setCredentials({
        refresh_token: credentials.refreshToken,
        access_token: credentials.accessToken
      })

      // 簡単なAPI呼び出しでトークンの有効性を確認
      await youtubeApi.channels.list({
        part: ['snippet'],
        mine: true
      })

      return true
    } catch (error) {
      console.error('Token validation error:', error)
      return false
    }
  }

  /**
   * アクセストークンを更新
   */
  static async refreshAccessToken(refreshToken: string): Promise<YouTubeCredentials> {
    try {
      oauth2Client.setCredentials({
        refresh_token: refreshToken
      })

      const { credentials } = await oauth2Client.refreshAccessToken()

      return {
        clientId: CLIENT_ID!,
        clientSecret: CLIENT_SECRET!,
        refreshToken: refreshToken,
        accessToken: credentials.access_token || undefined,
        expiresAt: credentials.expiry_date || undefined
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      throw new Error('Failed to refresh access token')
    }
  }
}

// 既存のファイルとの互換性のため
export default YouTube 