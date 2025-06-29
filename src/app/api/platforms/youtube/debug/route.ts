import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { db } from '@/lib/database'
import { PlatformCredentials } from '@/lib/encryption'

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // YouTubeプラットフォームの認証情報を取得
    let youtubePlatform = null
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query(
        'SELECT credentials FROM distribution_platforms WHERE user_id = $1 AND platform_type = $2',
        [user.id, 'youtube']
      )
      
      if (result.rows.length > 0) {
        const platform = result.rows[0]
        if (platform.credentials && platform.credentials.encrypted) {
          try {
            youtubePlatform = PlatformCredentials.decryptYouTube(platform.credentials.encrypted)
          } catch (error) {
            console.error('Decryption error:', error)
          }
        }
      }
    } else {
      const sqliteDb = await db
      const result = await sqliteDb.get(
        'SELECT credentials FROM distribution_platforms WHERE user_id = ? AND platform_type = ?',
        [user.id, 'youtube']
      )
      
      if (result && result.credentials) {
        try {
          const storedCredentials = typeof result.credentials === 'string' 
            ? JSON.parse(result.credentials) 
            : result.credentials
          
          if (storedCredentials.encrypted) {
            youtubePlatform = PlatformCredentials.decryptYouTube(storedCredentials.encrypted)
          }
        } catch (error) {
          console.error('Decryption error:', error)
        }
      }
    }

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