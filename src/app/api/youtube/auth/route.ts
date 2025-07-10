import { NextRequest, NextResponse } from 'next/server'
import { YouTube } from '@/lib/youtube'
import { verifyAuth } from '@/lib/auth'

// localhost専用のデフォルトユーザーID
const LOCALHOST_USER_ID = 'localhost-user'

export async function GET(request: NextRequest) {
  try {
    // localhost専用設定のため、認証チェックをスキップ
    const userId = LOCALHOST_USER_ID

    console.log('=== YouTube Auth Request ===')
    console.log('User ID:', userId)
    console.log('Environment:', process.env.NODE_ENV)
    console.log('Client ID:', process.env.YOUTUBE_CLIENT_ID ? `${process.env.YOUTUBE_CLIENT_ID.substring(0, 20)}...` : 'NOT SET')
    console.log('Client Secret:', process.env.YOUTUBE_CLIENT_SECRET ? 'SET' : 'NOT SET')
    console.log('Redirect URI:', process.env.NODE_ENV === 'production' 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/youtube/callback`
      : 'http://localhost:3000/api/youtube/callback')

    // 環境変数の確認
    if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
      return NextResponse.json({ 
        error: 'Configuration Error',
        message: 'YouTube client credentials not configured'
      }, { status: 500 })
    }

    // 認証URLを生成
    console.log('=== Generating YouTube Auth URL ===')
    const authUrl = YouTube.generateAuthUrl()
    console.log('YouTube auth URL generated successfully')
    console.log('Generated Auth URL:', authUrl)
    
    // リダイレクトURIの確認
    const expectedRedirectUri = process.env.NODE_ENV === 'production' 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/youtube/callback`
      : 'http://localhost:3000/api/youtube/callback'
    
    console.log('Expected Redirect URI:', expectedRedirectUri)
    console.log('=== YouTube Auth URL Generation Complete ===')

    return NextResponse.json({
      success: true,
      authUrl,
      redirectUri: process.env.NODE_ENV === 'production' 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/youtube/callback`
        : 'http://localhost:3000/api/youtube/callback'
    })

  } catch (error) {
    console.error('YouTube auth error:', error)
    return NextResponse.json({ 
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
} 