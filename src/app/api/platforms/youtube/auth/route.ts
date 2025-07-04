import { NextRequest, NextResponse } from 'next/server'
import { youtubeClient } from '@/lib/youtubeClient'
import { verifyAuth } from '@/lib/auth'
import { db } from '@/lib/database'
import { PlatformCredentials } from '@/lib/encryption'

export async function GET(request: NextRequest) {
  try {
    // ユーザー認証チェック
    const user = await verifyAuth(request)
    if (!user) {
      console.log('Unauthorized user attempting YouTube auth')
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Please login to authenticate YouTube'
      }, { status: 401 })
    }

    console.log('=== YouTube Auth API ===')
    console.log('User:', { id: user.id, email: user.email })

    // distribution_platformsテーブルからYouTube認証情報を取得
    let clientId: string | null = null
    let clientSecret: string | null = null

    if (process.env.NODE_ENV === 'production') {
      const result = await db.query(`
        SELECT credentials FROM distribution_platforms 
        WHERE user_id = $1 AND platform_type = 'youtube' AND is_active = true
      `, [user.id])
      
      if (result.rows && result.rows.length > 0) {
        const platform = result.rows[0]
        if (platform.credentials && platform.credentials.encrypted) {
          try {
            const decryptedCredentials = PlatformCredentials.decryptYouTube(platform.credentials.encrypted)
            clientId = decryptedCredentials.clientId
            clientSecret = decryptedCredentials.clientSecret
          } catch (error) {
            console.error('Error decrypting YouTube credentials:', error)
          }
        }
      }
    } else {
      const sqliteDb = await db
      const result = await sqliteDb.get(`
        SELECT credentials FROM distribution_platforms 
        WHERE user_id = ? AND platform_type = 'youtube' AND is_active = 1
      `, [user.id])
      
      if (result && result.credentials) {
        try {
          const storedCredentials = typeof result.credentials === 'string' 
            ? JSON.parse(result.credentials) 
            : result.credentials
          
          if (storedCredentials.encrypted) {
            const decryptedCredentials = PlatformCredentials.decryptYouTube(storedCredentials.encrypted)
            clientId = decryptedCredentials.clientId
            clientSecret = decryptedCredentials.clientSecret
          }
        } catch (error) {
          console.error('Error decrypting YouTube credentials:', error)
        }
      }
    }

    console.log('Database credentials:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      clientIdLength: clientId?.length || 0,
      clientSecretLength: clientSecret?.length || 0
    })

    if (!clientId || !clientSecret) {
      console.error('Missing YouTube credentials in database')
      return NextResponse.json({ 
        error: 'Missing YouTube credentials',
        message: 'YouTube client credentials not configured. Please set up YouTube credentials in the platform settings first.'
      }, { status: 500 })
    }

    // YouTubeクライアントを設定
    youtubeClient.setCredentials(clientId, clientSecret)
    
    // 認証URLを生成（ユーザーIDをstateパラメータに含める）
    const authUrl = youtubeClient.generateAuthUrl(user.id)
    
    console.log('YouTube auth URL generated successfully for user:', user.id)
    
    return NextResponse.json({ 
      authUrl,
      message: 'YouTube認証URLが生成されました。リンクをクリックして認証を完了してください。',
      userId: user.id
    })

  } catch (error) {
    console.error('YouTube auth error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate auth URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 