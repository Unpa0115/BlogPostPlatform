import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // ユーザー認証チェック
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Please login to view debug information'
      }, { status: 401 })
    }

    // 環境変数の詳細情報
    const config = {
      environment: process.env.NODE_ENV,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      youtube: {
        clientId: process.env.YOUTUBE_CLIENT_ID ? {
          exists: true,
          length: process.env.YOUTUBE_CLIENT_ID.length,
          hasWhitespace: /\s/.test(process.env.YOUTUBE_CLIENT_ID),
          trimmedLength: process.env.YOUTUBE_CLIENT_ID.trim().length,
          preview: `${process.env.YOUTUBE_CLIENT_ID.trim().substring(0, 10)}...${process.env.YOUTUBE_CLIENT_ID.trim().substring(-5)}`,
          rawPreview: `"${process.env.YOUTUBE_CLIENT_ID.substring(0, 20)}..."`
        } : {
          exists: false,
          message: 'YOUTUBE_CLIENT_ID not set'
        },
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET ? {
          exists: true,
          length: process.env.YOUTUBE_CLIENT_SECRET.length,
          hasWhitespace: /\s/.test(process.env.YOUTUBE_CLIENT_SECRET),
          trimmedLength: process.env.YOUTUBE_CLIENT_SECRET.trim().length,
          preview: `${process.env.YOUTUBE_CLIENT_SECRET.trim().substring(0, 10)}...${process.env.YOUTUBE_CLIENT_SECRET.trim().substring(-5)}`,
          rawPreview: `"${process.env.YOUTUBE_CLIENT_SECRET.substring(0, 20)}..."`
        } : {
          exists: false,
          message: 'YOUTUBE_CLIENT_SECRET not set'
        },
        apiKey: process.env.YOUTUBE_API_KEY ? {
          exists: true,
          length: process.env.YOUTUBE_API_KEY.length,
          preview: `${process.env.YOUTUBE_API_KEY.substring(0, 10)}...${process.env.YOUTUBE_API_KEY.substring(-5)}`
        } : {
          exists: false,
          message: 'YOUTUBE_API_KEY not set'
        }
      },
      redirectUri: process.env.NODE_ENV === 'production' 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/youtube/callback`
        : 'http://localhost:3000/api/youtube/callback',
      allEnvVars: Object.keys(process.env).filter(key => 
        key.includes('YOUTUBE') || key.includes('GOOGLE') || key.includes('OAUTH')
      ).reduce((acc, key) => {
        acc[key] = process.env[key] ? 'SET' : 'NOT SET'
        return acc
      }, {} as Record<string, string>)
    }

    return NextResponse.json({
      success: true,
      config,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('YouTube config debug error:', error)
    return NextResponse.json({ 
      error: 'Debug failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 