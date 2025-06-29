import { NextRequest, NextResponse } from 'next/server'
import { youtubeClient } from '@/lib/youtubeClient'
import { db } from '@/lib/database'
import { PlatformCredentials } from '@/lib/encryption'

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

    // 認証情報を直接データベースに保存
    try {
      // 既存のYouTubeプラットフォームを取得
      let existingPlatform = null
      if (process.env.NODE_ENV === 'production') {
        const result = await db.query(
          'SELECT id, credentials FROM distribution_platforms WHERE platform_type = $1 LIMIT 1',
          ['youtube']
        )
        if (result.rows.length > 0) {
          existingPlatform = result.rows[0]
        }
      } else {
        const sqliteDb = await db
        existingPlatform = await sqliteDb.get(
          'SELECT id, credentials FROM distribution_platforms WHERE platform_type = ? LIMIT 1',
          ['youtube']
        )
      }

      if (existingPlatform) {
        // 既存の認証情報を取得
        let existingCredentials = { clientId: '', clientSecret: '' }
        if (existingPlatform.credentials) {
          try {
            const storedCredentials = typeof existingPlatform.credentials === 'string' 
              ? JSON.parse(existingPlatform.credentials) 
              : existingPlatform.credentials
            
            if (storedCredentials.encrypted) {
              existingCredentials = PlatformCredentials.decryptYouTube(storedCredentials.encrypted)
            }
          } catch (error) {
            console.error('Error decrypting existing credentials:', error)
          }
        }

        // 新しい認証情報と既存の認証情報をマージ
        const updatedCredentials = {
          ...existingCredentials,
          accessToken: authResponse.access_token,
          refreshToken: authResponse.refresh_token
        }

        // 認証情報を暗号化
        const encryptedCredentials = {
          encrypted: PlatformCredentials.encryptYouTube(updatedCredentials)
        }

        // データベースを更新
        if (process.env.NODE_ENV === 'production') {
          await db.query(`
            UPDATE distribution_platforms 
            SET credentials = $1, updated_at = NOW()
            WHERE id = $2
          `, [encryptedCredentials, existingPlatform.id])
        } else {
          const sqliteDb = await db
          const now = new Date().toISOString()
          await sqliteDb.run(`
            UPDATE distribution_platforms 
            SET credentials = ?, updated_at = ?
            WHERE id = ?
          `, [JSON.stringify(encryptedCredentials), now, existingPlatform.id])
        }

        console.log('YouTube credentials updated successfully in database')
      } else {
        console.error('No existing YouTube platform found to update')
      }
    } catch (updateError) {
      console.error('Error updating YouTube credentials in database:', updateError)
      // 認証情報の更新に失敗しても認証フローは続行
    }

    // フロントエンドにリダイレクト
    const redirectUrl = process.env.NODE_ENV === 'production'
      ? `${process.env.NEXT_PUBLIC_APP_URL}/platforms?youtube_auth=success`
      : 'http://localhost:3000/platforms?youtube_auth=success'

    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('YouTube callback error:', error)
    
    const errorRedirectUrl = process.env.NODE_ENV === 'production'
      ? `${process.env.NEXT_PUBLIC_APP_URL}/platforms?youtube_auth=error`
      : 'http://localhost:3000/platforms?youtube_auth=error'
    
    return NextResponse.redirect(errorRedirectUrl)
  }
} 