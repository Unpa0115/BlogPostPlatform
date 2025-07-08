import { NextRequest, NextResponse } from 'next/server'
import { YouTube } from '@/lib/youtube'
import { db } from '@/lib/database'
import { CredentialEncryption } from '@/lib/encryption'
import { verifyAuth } from '@/lib/auth'

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
      if (process.env.NODE_ENV === 'production') {
        await db.query(
          `INSERT INTO platform_credentials (platform_type, client_id, client_secret, access_token, refresh_token, expires_at, is_active) 
           VALUES ($1, $2, $3, $4, $5, $6, $7) 
           ON CONFLICT (platform_type) 
           DO UPDATE SET 
             client_id = $2, 
             client_secret = $3, 
             access_token = $4, 
             refresh_token = $5, 
             expires_at = $6, 
             is_active = $7, 
             updated_at = CURRENT_TIMESTAMP`,
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
      } else {
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
      }
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
      const user = await verifyAuth(request)
      if (user) {
        // 暗号化された認証情報を作成
        const encryptedCredentials = CredentialEncryption.encrypt(JSON.stringify(credentials), CredentialEncryption.getMasterKey())
        
        if (process.env.NODE_ENV === 'production') {
          await db.query(`
            INSERT INTO distribution_platforms (user_id, platform_type, platform_name, credentials, is_active)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (user_id, platform_type)
            DO UPDATE SET 
              platform_name = $3,
              credentials = $4,
              is_active = $5,
              updated_at = CURRENT_TIMESTAMP
          `, [
            user.id,
            'youtube',
            'YouTube',
            { encrypted: encryptedCredentials },
            true
          ])
        } else {
          const sqliteDb = await db
          await sqliteDb.run(`
            INSERT OR REPLACE INTO distribution_platforms (user_id, platform_type, platform_name, credentials, is_active)
            VALUES (?, ?, ?, ?, ?)
          `, [
            user.id,
            'youtube',
            'YouTube',
            JSON.stringify({ encrypted: encryptedCredentials }),
            true
          ])
        }
        console.log('Distribution platforms table updated successfully')
      }
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