import { NextRequest, NextResponse } from 'next/server'
import { youtubeClient } from '@/lib/youtubeClient'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const clientSecret = searchParams.get('clientSecret')
    const userId = searchParams.get('userId')

    console.log('=== YouTube Auth API Debug ===')
    console.log('Received parameters:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasUserId: !!userId,
      userId: userId
    })
    
    // ユーザーIDの詳細確認
    if (userId) {
      console.log('User ID received:', userId)
      console.log('User ID length:', userId.length)
      console.log('User ID type:', typeof userId)
    } else {
      console.log('No user ID provided')
    }

    if (!clientId || !clientSecret) {
      console.log('Missing clientId or clientSecret')
      return NextResponse.json({ 
        error: 'Missing clientId or clientSecret' 
      }, { status: 400 })
    }

    if (!userId) {
      console.log('No userId provided, using default')
    }

    // YouTubeクライアントを設定
    youtubeClient.setCredentials(clientId, clientSecret)
    
    // 認証URLを生成（ユーザーIDを含む）
    const authUrl = youtubeClient.generateAuthUrl(userId || undefined)
    
    console.log('Generated auth URL with userId:', userId || 'default')
    
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