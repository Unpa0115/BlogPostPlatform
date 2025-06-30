import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { db } from '@/lib/database'
import { PlatformCredentials } from '@/lib/encryption'

// Voicy認証情報取得
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Voicyプラットフォームの認証情報を取得
    if (process.env.NODE_ENV === 'production') {
      // PostgreSQL
      const result = await db.query(`
        SELECT credentials
        FROM distribution_platforms
        WHERE user_id = $1 AND platform_type = 'voicy' AND is_active = true
        LIMIT 1
      `, [user.id])

      if (result.rows.length === 0) {
        return NextResponse.json({ 
          error: 'Voicy credentials not found',
          message: 'Voicyの認証情報が設定されていません。プラットフォーム設定ページで設定してください。'
        }, { status: 404 })
      }

      const platform = result.rows[0]
      if (!platform.credentials || !platform.credentials.encrypted) {
        return NextResponse.json({ 
          error: 'Invalid credentials format',
          message: '認証情報の形式が正しくありません。'
        }, { status: 400 })
      }

      try {
        const decryptedCredentials = PlatformCredentials.decryptVoicy(platform.credentials.encrypted)
        return NextResponse.json({
          success: true,
          data: decryptedCredentials
        })
      } catch (error) {
        console.error('Voicy credentials decryption error:', error)
        return NextResponse.json({ 
          error: 'Failed to decrypt credentials',
          message: '認証情報の復号化に失敗しました。'
        }, { status: 500 })
      }
    } else {
      // SQLite
      const sqliteDb = await db
      const result = await sqliteDb.get(`
        SELECT credentials
        FROM distribution_platforms
        WHERE user_id = ? AND platform_type = 'voicy' AND is_active = 1
        LIMIT 1
      `, [user.id])

      if (!result) {
        return NextResponse.json({ 
          error: 'Voicy credentials not found',
          message: 'Voicyの認証情報が設定されていません。プラットフォーム設定ページで設定してください。'
        }, { status: 404 })
      }

      if (!result.credentials) {
        return NextResponse.json({ 
          error: 'Invalid credentials format',
          message: '認証情報の形式が正しくありません。'
        }, { status: 400 })
      }

      try {
        const credentials = typeof result.credentials === 'string' 
          ? JSON.parse(result.credentials) 
          : result.credentials
        
        if (!credentials.encrypted) {
          return NextResponse.json({ 
            error: 'Invalid credentials format',
            message: '認証情報の形式が正しくありません。'
          }, { status: 400 })
        }

        const decryptedCredentials = PlatformCredentials.decryptVoicy(credentials.encrypted)
        return NextResponse.json({
          success: true,
          data: decryptedCredentials
        })
      } catch (error) {
        console.error('Voicy credentials decryption error:', error)
        return NextResponse.json({ 
          error: 'Failed to decrypt credentials',
          message: '認証情報の復号化に失敗しました。'
        }, { status: 500 })
      }
    }

  } catch (error) {
    console.error('Get Voicy credentials error:', error)
    return NextResponse.json({ 
      error: 'Failed to get Voicy credentials',
      message: 'Voicy認証情報の取得に失敗しました。'
    }, { status: 500 })
  }
} 