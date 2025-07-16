import { NextRequest, NextResponse } from 'next/server'
import { getPlatformConfig, checkPlatformStatus, debugPlatformConfig } from '@/lib/env-config'

// プラットフォーム一覧取得（環境変数ベース）
export async function GET(request: NextRequest) {
  try {
    console.log('=== Platform Settings API (Environment Variables) ===')
    
    // 環境変数から設定を取得
    const config = getPlatformConfig()
    const status = checkPlatformStatus()
    
    // デバッグ情報出力
    debugPlatformConfig()
    
    // プラットフォーム情報を整形
    const platforms = [
      {
        id: 'openai',
        platform_type: 'openai',
        platform_name: 'OpenAI',
        is_active: config.openai.isConfigured,
        credentials: config.openai.isConfigured ? {
          apiKey: config.openai.apiKey?.substring(0, 8) + '...' // セキュリティのため一部のみ表示
        } : null,
        status: status.openai.status,
        message: status.openai.message,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'youtube',
        platform_type: 'youtube',
        platform_name: 'YouTube',
        is_active: config.youtube.isConfigured,
        credentials: config.youtube.isConfigured ? {
          clientId: config.youtube.clientId?.substring(0, 8) + '...',
          clientSecret: config.youtube.clientSecret?.substring(0, 8) + '...',
          redirectUri: config.youtube.redirectUri
        } : null,
        status: status.youtube.status,
        message: status.youtube.message,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'voicy',
        platform_type: 'voicy',
        platform_name: 'Voicy',
        is_active: config.voicy.isConfigured,
        credentials: config.voicy.isConfigured ? {
          email: config.voicy.email,
          password: config.voicy.password ? '****' : null, // パスワードは隠す
          browserlessApiKey: config.voicy.browserlessApiKey?.substring(0, 8) + '...'
        } : null,
        status: status.voicy.status,
        message: status.voicy.message,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'spotify',
        platform_type: 'spotify',
        platform_name: 'Spotify',
        is_active: config.spotify.isConfigured,
        credentials: config.spotify.isConfigured ? 
          (config.spotify.rssFeedUrl && !config.spotify.clientId ? {
            // RSS Feed URLのみの場合
            rssFeedUrl: config.spotify.rssFeedUrl
          } : {
            // Spotify API設定の場合
            clientId: config.spotify.clientId?.substring(0, 8) + '...',
            clientSecret: config.spotify.clientSecret?.substring(0, 8) + '...',
            rssFeedUrl: config.spotify.rssFeedUrl
          }) : null,
        status: status.spotify.status,
        message: status.spotify.message,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]

    return NextResponse.json({
      success: true,
      data: platforms,
      source: 'environment_variables',
      message: 'プラットフォーム設定は環境変数から読み込まれています'
    })

  } catch (error) {
    console.error('Get platforms error:', error)
    return NextResponse.json({ 
      error: 'Failed to get platforms',
      message: '環境変数の読み込みに失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// プラットフォーム設定更新（環境変数へのガイダンス）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { platform_type } = body

    return NextResponse.json({
      success: false,
      error: 'Environment variable configuration required',
      message: `${platform_type}の設定は環境変数で行ってください`,
      instructions: {
        step1: '.env.localファイルを作成または編集',
        step2: 'env.exampleを参考に必要な環境変数を設定',
        step3: 'アプリケーションを再起動',
        example: platform_type === 'openai' 
          ? 'OPENAI_API_KEY="sk-your-api-key-here"'
          : platform_type === 'youtube'
          ? 'YOUTUBE_CLIENT_ID="your-client-id"\nYOUTUBE_CLIENT_SECRET="your-client-secret"'
          : platform_type === 'voicy'
          ? 'VOICY_EMAIL="your-email"\nVOICY_PASSWORD="your-password"'
          : 'env.exampleを参照してください'
      },
      documentation: 'env.exampleファイルに詳細な設定例があります'
    }, { status: 400 })

  } catch (error) {
    console.error('Platform configuration error:', error)
    return NextResponse.json({ 
      error: 'Configuration failed',
      message: '設定の処理に失敗しました'
    }, { status: 500 })
  }
}

// プラットフォーム認証情報更新（環境変数へのガイダンス）
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { platform_type } = body

    return NextResponse.json({
      success: false,
      error: 'Environment variable configuration required',
      message: `${platform_type}の認証情報は環境変数で設定してください`,
      instructions: {
        step1: '.env.localファイルで環境変数を設定',
        step2: 'アプリケーションを再起動',
        note: 'UI上での設定は不要になりました'
      }
    }, { status: 400 })

  } catch (error) {
    console.error('Update platform credentials error:', error)
    return NextResponse.json({ 
      error: 'Update failed',
      message: '認証情報の更新に失敗しました'
    }, { status: 500 })
  }
} 