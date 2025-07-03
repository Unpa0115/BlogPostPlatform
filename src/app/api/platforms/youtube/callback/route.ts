import { NextRequest, NextResponse } from 'next/server'
import { youtubeClient } from '@/lib/youtubeClient'
import { db } from '@/lib/database'
import { PlatformCredentials } from '@/lib/encryption'
import { YouTubeTokenManager } from '@/lib/youtube-token-manager'
import { getUserById, registerUser, verifyAuth } from '@/lib/auth'

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

    // ユーザーIDの取得ロジック
    let userId: string | undefined
    let user: any = null
    let userEmail: string | undefined

    console.log('=== YouTube Callback User Debug ===')
    console.log('State parameter:', state)
    console.log('Code parameter:', code ? 'present' : 'missing')

    // 1. stateパラメータからユーザーIDを取得（推奨）
    if (state) {
      userId = state
      console.log('Attempting to get user by ID from state:', userId)
      try {
        user = await getUserById(userId)
        userEmail = user?.email
        console.log('User found from state:', !!user)
        console.log('User email from state:', userEmail)
      } catch (error) {
        console.error('Error getting user by state ID:', error)
      }
    }

    // 2. それでもなければデフォルトユーザーIDを使用
    if (!userId || !user) {
      console.log('State user not found, trying default user ID')
      userId = '10699750-312a-4f82-ada7-c8e5cf9b1fa8'
      try {
        user = await getUserById(userId)
        userEmail = user?.email
        console.log('Using default user ID:', userId)
        console.log('User found from default:', !!user)
        console.log('User email from default:', userEmail)
      } catch (error) {
        console.error('Error getting default user:', error)
      }
    }

    // 3. データベース内の全ユーザーを確認（デバッグ用）
    console.log('=== Database Users Debug ===')
    try {
      if (process.env.NODE_ENV === 'production') {
        const allUsers = await db.query('SELECT id, email FROM users LIMIT 10')
        console.log('PostgreSQL users:', allUsers.rows)
      } else {
        const sqliteDb = await db
        const allUsers = await sqliteDb.all('SELECT id, email FROM users LIMIT 10')
        console.log('SQLite users:', allUsers)
      }
    } catch (error) {
      console.log('Failed to fetch users for debug:', error)
    }

    // 3. 最終的なユーザー存在確認
    if (!user) {
      console.error('No valid user found for YouTube authentication')
      console.log('Available users in database:')
      
      // データベース内のユーザー一覧を確認（デバッグ用）
      try {
        if (process.env.NODE_ENV === 'production') {
          const allUsers = await db.query('SELECT id, email FROM users LIMIT 5')
          console.log('PostgreSQL users:', allUsers.rows)
        } else {
          const sqliteDb = await db
          const allUsers = await sqliteDb.all('SELECT id, email FROM users LIMIT 5')
          console.log('SQLite users:', allUsers)
        }
      } catch (error) {
        console.log('Failed to fetch users for debug:', error)
      }
      
      return NextResponse.json({
        error: 'No valid user found for YouTube authentication',
        details: 'ユーザーが見つかりません。ログイン状態で再度お試しください'
      }, { status: 401 })
    }

    console.log('YouTube authentication for user:', { userId, userEmail })

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

    // platform_credentialsテーブルに保存
    try {
      if (process.env.NODE_ENV === 'production') {
        const existingCredential = await db.query(
          'SELECT * FROM platform_credentials WHERE platform_type = $1',
          ['youtube']
        )

        if (existingCredential.rows.length > 0) {
          await db.query(`
            UPDATE platform_credentials 
            SET client_id = $1,
                client_secret = $2,
                access_token = $3,
                refresh_token = $4,
                            is_active = true,
            updated_at = NOW()
          WHERE platform_type = 'youtube'
        `, [
          process.env.YOUTUBE_CLIENT_ID,
          process.env.YOUTUBE_CLIENT_SECRET,
          authResponse.access_token,
          authResponse.refresh_token
        ])
      } else {
        await db.query(`
          INSERT INTO platform_credentials (
            platform_type, client_id, client_secret, access_token, refresh_token, is_active
          ) VALUES ($1, $2, $3, $4, $5, true)
        `, [
          'youtube',
          process.env.YOUTUBE_CLIENT_ID,
          process.env.YOUTUBE_CLIENT_SECRET,
          authResponse.access_token,
          authResponse.refresh_token
        ])
      }
    } else {
      const sqliteDb = await db
      const existingCredential = await sqliteDb.get(
        'SELECT * FROM platform_credentials WHERE platform_type = ?',
        ['youtube']
      )

      if (existingCredential) {
        await sqliteDb.run(`
          UPDATE platform_credentials 
          SET client_id = ?,
              client_secret = ?,
              access_token = ?,
              refresh_token = ?,
              is_active = 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE platform_type = 'youtube'
        `, [
          process.env.YOUTUBE_CLIENT_ID,
          process.env.YOUTUBE_CLIENT_SECRET,
          authResponse.access_token,
          authResponse.refresh_token
        ])
      } else {
        await sqliteDb.run(`
          INSERT INTO platform_credentials (
            platform_type, client_id, client_secret, access_token, refresh_token, is_active
          ) VALUES (?, ?, ?, ?, ?, 1)
        `, [
          'youtube',
          process.env.YOUTUBE_CLIENT_ID,
          process.env.YOUTUBE_CLIENT_SECRET,
          authResponse.access_token,
          authResponse.refresh_token
        ])
      }
      }
      console.log('Platform credentials updated successfully')
    } catch (error) {
      console.error('Failed to update platform credentials:', error)
      // プラットフォーム認証情報の更新に失敗しても、トークンの保存は成功しているので続行
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

    // 成功時にプラットフォームページにリダイレクト
    const baseUrl = process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_APP_URL || 'https://blogpostplatform-production.up.railway.app'
      : 'http://localhost:3000'
    
    const redirectUrl = `${baseUrl}/platforms?youtube_auth=success`
    
    console.log('Redirecting to:', redirectUrl)
    
    return NextResponse.redirect(redirectUrl)

  } catch (error: any) {
    console.error('YouTube callback error:', error)
    
    // エラー時にもプラットフォームページにリダイレクト
    const baseUrl = process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_APP_URL || 'https://blogpostplatform-production.up.railway.app'
      : 'http://localhost:3000'
    
    const redirectUrl = `${baseUrl}/platforms?youtube_auth=error&error=${encodeURIComponent(error.message)}`
    
    console.log('Redirecting to error page:', redirectUrl)
    
    return NextResponse.redirect(redirectUrl)
  }
} 