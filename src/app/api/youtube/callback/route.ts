import { NextRequest, NextResponse } from 'next/server'
import { YouTube } from '@/lib/youtube'
import { db } from '@/lib/database'
import { CredentialEncryption } from '@/lib/encryption'
import { verifyAuth } from '@/lib/auth'

// localhost専用のデフォルトユーザーID
const LOCALHOST_USER_ID = 'localhost-user'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    console.log('=== YouTube OAuth Callback ===')
    console.log('Request URL:', request.url)
    console.log('Search params:', Object.fromEntries(searchParams.entries()))
    console.log('Has code:', !!code)
    console.log('Has error:', !!error)
    console.log('Environment:', process.env.NODE_ENV)
    console.log('App URL:', process.env.NEXT_PUBLIC_APP_URL)

    // OAuth エラーの処理
    if (error) {
      console.error('YouTube OAuth error:', error)
      console.error('Error details:', {
        error,
        errorDescription: searchParams.get('error_description'),
        errorUri: searchParams.get('error_uri'),
        state: searchParams.get('state')
      })
      return NextResponse.redirect(
        new URL(`/platforms?youtube_auth=error&error=${encodeURIComponent(error)}`, request.url).toString()
      )
    }

    // 認証コードの確認
    if (!code) {
      console.error('No authorization code received')
      return NextResponse.redirect(
        new URL('/platforms?youtube_auth=error&error=No authorization code received', request.url).toString()
      )
    }

    // 認証コードをトークンに交換
    console.log('Exchanging code for tokens...')
    console.log('Authorization code length:', code.length)
    console.log('Authorization code preview:', code.substring(0, 10) + '...')
    
    const credentials = await YouTube.exchangeCodeForTokens(code)
    
    console.log('Token exchange successful')
    console.log('Credentials received:', {
      hasClientId: !!credentials.clientId,
      hasClientSecret: !!credentials.clientSecret,
      hasRefreshToken: !!credentials.refreshToken,
      hasAccessToken: !!credentials.accessToken,
      expiresAt: credentials.expiresAt
    })

    try {
      const sqliteDb = await db
      await sqliteDb.run(
        `INSERT OR REPLACE INTO platform_credentials (platform_type, client_id, client_secret, access_token, refresh_token, expires_at, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'youtube', 
          credentials.clientId, 
          credentials.clientSecret, 
          credentials.accessToken, 
          credentials.refreshToken, 
          credentials.expiresAt ? new Date(credentials.expiresAt) : null,
          true
        ]
      )
    } catch (dbError) {
      console.error('Database error:', dbError)
      console.error('Database error details:', {
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
        stack: dbError instanceof Error ? dbError.stack : undefined
      })
      return NextResponse.redirect(
        new URL(`/platforms?youtube_auth=error&error=${encodeURIComponent('Database error: ' + (dbError instanceof Error ? dbError.message : 'Unknown error'))}`, request.url).toString()
      )
    }

    console.log('YouTube authentication completed successfully')

    // distribution_platformsテーブルも更新（データ整合性のため）
    try {
      // localhost専用設定のため、認証チェックをスキップ
      const userId = LOCALHOST_USER_ID
      
      // 暗号化された認証情報を作成
      const encryptedCredentials = CredentialEncryption.encrypt(JSON.stringify(credentials), CredentialEncryption.getMasterKey())
      
      const sqliteDb = await db
      await sqliteDb.run(`
        INSERT OR REPLACE INTO distribution_platforms (user_id, platform_type, platform_name, credentials, is_active)
        VALUES (?, ?, ?, ?, ?)
      `, [
        userId,
        'youtube',
        'YouTube',
        JSON.stringify({ encrypted: encryptedCredentials }),
        true
      ])
      console.log('Distribution platforms table updated successfully')
    } catch (updateError) {
      console.error('Failed to update distribution_platforms:', updateError)
      // メインの認証は成功しているので、このエラーは無視
    }

    // 成功時のリダイレクト
    return NextResponse.redirect(
      new URL('/platforms?youtube_auth=success', request.url).toString()
    )

  } catch (error) {
    console.error('YouTube callback error:', error)
    return NextResponse.redirect(
      new URL(`/platforms?youtube_auth=error&error=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`, request.url).toString()
    )
  }
} 