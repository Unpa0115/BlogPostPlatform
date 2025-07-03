import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getUserById } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // クエリパラメータから userId を取得（なければデフォルト）
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || '10699750-312a-4f82-ada7-c8e5cf9b1fa8'
    
    // ユーザー情報を取得
    const user = await getUserById(userId)
    
    // YouTubeプラットフォーム設定を取得
    let youtubePlatform = null
    try {
      if (process.env.NODE_ENV === 'production') {
        const platformResult = await db.query(
          'SELECT * FROM platform_credentials WHERE platform_type = $1',
          ['youtube']
        )
        youtubePlatform = platformResult.rows[0] || null
      } else {
        const sqliteDb = await db
        youtubePlatform = await sqliteDb.get(
          'SELECT * FROM platform_credentials WHERE platform_type = ?',
          ['youtube']
        )
      }
    } catch (error) {
      console.error('Error fetching platform credentials:', error)
      youtubePlatform = null
    }

    // YouTubeトークン情報を取得
    let youtubeToken = null
    try {
      if (process.env.NODE_ENV === 'production') {
        const tokenResult = await db.query(
          'SELECT * FROM youtube_tokens WHERE user_id = $1',
          [userId]
        )
        youtubeToken = tokenResult.rows[0] || null
      } else {
        const sqliteDb = await db
        youtubeToken = await sqliteDb.get(
          'SELECT * FROM youtube_tokens WHERE user_id = ?',
          [userId]
        )
      }
    } catch (error) {
      console.error('Error fetching YouTube token:', error)
    }

    // 環境変数の確認
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      YOUTUBE_CLIENT_ID: process.env.YOUTUBE_CLIENT_ID ? '***' + process.env.YOUTUBE_CLIENT_ID.slice(-4) : null,
      YOUTUBE_CLIENT_SECRET: process.env.YOUTUBE_CLIENT_SECRET ? '***' + process.env.YOUTUBE_CLIENT_SECRET.slice(-4) : null,
    }

    // リダイレクトURIの計算
    const baseUrl = process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_APP_URL || 'https://blogpostplatform-production.up.railway.app'
      : 'http://localhost:3000'
    
    const redirectUri = `${baseUrl}/api/platforms/youtube/callback`

    return NextResponse.json({
      success: true,
      debug: {
        hasClientId: !!youtubePlatform?.clientId,
        hasClientSecret: !!youtubePlatform?.clientSecret,
        hasAccessToken: !!youtubePlatform?.accessToken,
        hasRefreshToken: !!youtubePlatform?.refreshToken,
        clientIdLength: youtubePlatform?.clientId?.length || 0,
        clientSecretLength: youtubePlatform?.clientSecret?.length || 0,
        accessTokenLength: youtubePlatform?.accessToken?.length || 0,
        refreshTokenLength: youtubePlatform?.refreshToken?.length || 0,
        platformExists: !!youtubePlatform
      },
      user: user ? {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        exists: true
      } : {
        id: userId,
        exists: false,
        message: 'User not found'
      },
      youtubeToken: youtubeToken ? {
        id: youtubeToken.id,
        user_id: youtubeToken.user_id,
        hasAccessToken: !!youtubeToken.access_token,
        hasRefreshToken: !!youtubeToken.refresh_token,
        status: youtubeToken.status,
        failure_count: youtubeToken.failure_count,
        expires_at: youtubeToken.expires_at,
        created_at: youtubeToken.created_at,
        exists: true
      } : {
        exists: false,
        message: 'YouTube token not found'
      },
      environment: envInfo,
      redirectUri: {
        calculated: redirectUri,
        baseUrl: baseUrl,
        environment: process.env.NODE_ENV
      },
      platform: youtubePlatform ? {
        clientId: youtubePlatform.clientId ? '***' + youtubePlatform.clientId.slice(-4) : null,
        clientSecret: youtubePlatform.clientSecret ? '***' + youtubePlatform.clientSecret.slice(-4) : null,
        accessToken: youtubePlatform.accessToken ? '***' + youtubePlatform.accessToken.slice(-4) : null,
        refreshToken: youtubePlatform.refreshToken ? '***' + youtubePlatform.refreshToken.slice(-4) : null
      } : null
    })
  } catch (error) {
    console.error('YouTube debug error:', error)
    return NextResponse.json({ 
      error: 'Failed to get debug info',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 