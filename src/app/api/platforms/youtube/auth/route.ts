import { NextRequest, NextResponse } from 'next/server'
import { youtubeClient } from '@/lib/youtubeClient'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const clientSecret = searchParams.get('clientSecret')
    const userId = searchParams.get('userId')

    if (!clientId || !clientSecret) {
      return NextResponse.json({ 
        error: 'Missing clientId or clientSecret' 
      }, { status: 400 })
    }

    // YouTubeクライアントを設定
    youtubeClient.setCredentials(clientId, clientSecret)
    
    // 認証URLを生成（ユーザーIDを含む）
    const authUrl = youtubeClient.generateAuthUrl(userId || undefined)
    
    return NextResponse.json({ 
      authUrl,
      message: 'Please visit this URL to authorize YouTube access',
      userId: userId || 'default'
    })
  } catch (error) {
    console.error('YouTube auth error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate auth URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 