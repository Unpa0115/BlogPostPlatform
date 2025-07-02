import { NextRequest, NextResponse } from 'next/server'
import { youtubeClient } from '@/lib/youtubeClient'
import { db } from '@/lib/database'
import { PlatformCredentials } from '@/lib/encryption'
import { YouTubeTokenManager } from '@/lib/youtube-token-manager'
import { getUserById, registerUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const state = searchParams.get('state') // ユーザーIDやプラットフォームIDを含む可能性

    if (error) {
      console.error('YouTube OAuth error:', error)
      return NextResponse.json({ 
        error: 'OAuth authorization failed',
        details: error
      }, { status: 400 })
    }

    if (!code) {
      return NextResponse.json({ 
        error: 'No authorization code received' 
      }, { status: 400 })
    }

    console.log('YouTube OAuth callback received with code')

    // 認証コードをトークンに交換
    const authResponse = await youtubeClient.handleAuthCallback(code)
    
    console.log('YouTube OAuth successful:', {
      hasAccessToken: !!authResponse.access_token,
      hasRefreshToken: !!authResponse.refresh_token
    })

    // ユーザーIDを取得（stateパラメータから、またはデフォルトユーザーIDを使用）
    let userId = state // stateパラメータにユーザーIDが含まれている場合
    
    if (!userId) {
      // デフォルトユーザーIDを使用（開発環境用）
      userId = '10699750-312a-4f82-ada7-c8e5cf9b1fa8'
    }

    // ユーザーの存在確認
    let user = await getUserById(userId)
    
    if (!user) {
      console.log(`User ${userId} not found, creating default user...`)
      
      // デフォルトユーザーを作成
      try {
        user = await registerUser('default@example.com', 'defaultpassword123')
        userId = user.id
        console.log(`Default user created with ID: ${userId}`)
      } catch (error) {
        console.error('Failed to create default user:', error)
        return NextResponse.json({ 
          error: 'Failed to create user',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
      }
    } else {
      console.log(`User ${userId} found:`, user.email)
    }

    // YouTube token管理システムに保存
    try {
      await YouTubeTokenManager.saveToken(
        userId,
        authResponse.refresh_token,
        authResponse.access_token
      )
      console.log(`YouTube token saved for user ${userId}`)
    } catch (error) {
      console.error('Failed to save YouTube token:', error)
      return NextResponse.json({ 
        error: 'Failed to save authentication token',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

    // 既存のplatform_settingsテーブルにも保存（後方互換性のため）
    try {
      const currentSettings = await db.query(
        'SELECT * FROM platform_settings WHERE platform_type = $1',
        ['youtube']
      )

      if (process.env.NODE_ENV === 'production') {
        if (currentSettings.rows.length > 0) {
          await db.query(`
            UPDATE platform_settings 
            SET settings = jsonb_set(settings, '{refreshToken}', $1),
                is_active = true,
                updated_at = NOW()
            WHERE platform_type = 'youtube'
          `, [JSON.stringify(authResponse.refresh_token)])
        } else {
          await db.query(`
            INSERT INTO platform_settings (platform_type, settings, is_active)
            VALUES ('youtube', $1, true)
          `, [JSON.stringify({ refreshToken: authResponse.refresh_token })])
        }
      } else {
        const sqliteDb = await db
        if (currentSettings.length > 0) {
          const settings = JSON.parse(currentSettings[0].settings)
          settings.refreshToken = authResponse.refresh_token
          await sqliteDb.run(`
            UPDATE platform_settings 
            SET settings = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP
            WHERE platform_type = 'youtube'
          `, [JSON.stringify(settings)])
        } else {
          await sqliteDb.run(`
            INSERT INTO platform_settings (platform_type, settings, is_active)
            VALUES ('youtube', ?, 1)
          `, [JSON.stringify({ refreshToken: authResponse.refresh_token })])
        }
      }
      console.log('Platform settings updated successfully')
    } catch (error) {
      console.error('Failed to update platform settings:', error)
      // プラットフォーム設定の更新に失敗しても、トークンの保存は成功しているので続行
    }

    // 成功レスポンス
    return NextResponse.json({
      success: true,
      message: 'YouTube authentication completed successfully',
      hasRefreshToken: !!authResponse.refresh_token,
      userId: userId,
      userEmail: user.email
    })

  } catch (error: any) {
    console.error('YouTube callback error:', error)
    return NextResponse.json({ 
      error: 'Authentication failed',
      details: error.message
    }, { status: 500 })
  }
} 