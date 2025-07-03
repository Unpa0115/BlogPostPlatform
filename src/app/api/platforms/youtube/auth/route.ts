import { NextRequest, NextResponse } from 'next/server'
import { youtubeClient } from '@/lib/youtubeClient'
import { verifyAuth } from '@/lib/auth'

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

    // 環境変数の確認
    const clientId = process.env.YOUTUBE_CLIENT_ID
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET

    console.log('Environment variables:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      clientIdLength: clientId?.length || 0,
      clientSecretLength: clientSecret?.length || 0
    })

    if (!clientId || !clientSecret) {
      console.error('Missing YouTube credentials in environment variables')
      return NextResponse.json({ 
        error: 'Missing YouTube credentials',
        message: 'YouTube client credentials not configured'
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