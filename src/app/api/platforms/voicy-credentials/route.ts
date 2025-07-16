import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { db } from '@/lib/database'
import { PlatformCredentials } from '@/lib/encryption'

// localhost専用のデフォルトユーザーID
const LOCALHOST_USER_ID = 'localhost-user'

// Voicy認証情報取得（環境変数ベース）
export async function GET(request: NextRequest) {
  try {
    console.log('=== Voicy Credentials API (Environment Variables) ===')
    
    // 環境変数からVoicy認証情報を取得
    const email = process.env.VOICY_EMAIL
    const password = process.env.VOICY_PASSWORD
    const browserlessApiKey = process.env.BROWSERLESS_API_KEY

    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Voicy credentials not configured',
        message: 'VOICY_EMAILとVOICY_PASSWORDを.env.localファイルで設定してください',
        instructions: {
          step1: '.env.localファイルを作成または編集',
          step2: 'VOICY_EMAIL="your-email@example.com"を追加',
          step3: 'VOICY_PASSWORD="your-password"を追加',
          step4: 'アプリケーションを再起動'
        }
      }, { status: 404 })
    }

    if (!email.includes('@')) {
      return NextResponse.json({ 
        error: 'Invalid email format',
        message: 'VOICY_EMAILの形式が正しくありません。有効なメールアドレスを設定してください。'
      }, { status: 400 })
    }

    console.log('✅ Voicy credentials found in environment variables')
    console.log('  - Email:', email)
    console.log('  - Password:', password ? '[SET]' : '[NOT SET]')
    console.log('  - Browserless API Key:', browserlessApiKey ? '[SET]' : '[NOT SET]')

    return NextResponse.json({
      success: true,
      data: {
        email,
        password,
        browserlessApiKey
      },
      source: 'environment_variables',
      message: 'Voicy認証情報は環境変数から読み込まれています'
    })

  } catch (error) {
    console.error('Get Voicy credentials error:', error)
    return NextResponse.json({ 
      error: 'Failed to get Voicy credentials',
      message: 'Voicy認証情報の取得に失敗しました。',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 