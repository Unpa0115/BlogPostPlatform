import { NextRequest, NextResponse } from 'next/server'
import { youtubeClient } from '@/lib/youtubeClient'
import { YouTubeTokenManager } from '@/lib/youtube-token-manager'
import { getUserById } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const state = searchParams.get('state') // ユーザーID

    console.log('=== YouTube OAuth Callback ===')
    console.log('Parameters:', {
      hasCode: !!code,
      hasError: !!error,
      state: state
    })

    // OAuth エラーの処理
    if (error) {
      console.error('YouTube OAuth error:', error)
      return redirectToError('OAuth authorization failed', error)
    }

    // 認証コードの確認
    if (!code) {
      console.error('No authorization code received')
      return redirectToError('No authorization code received', 'missing_code')
    }

    // ユーザーIDの確認
    if (!state) {
      console.error('No user ID in state parameter')
      return redirectToError('No user ID provided', 'missing_user_id')
    }

    // ユーザーの存在確認
    console.log('Verifying user:', state)
    const user = await getUserById(state)
    if (!user) {
      console.error('User not found:', state)
      return redirectToError('User not found', 'invalid_user')
    }

    console.log('User verified:', { userId: user.id, email: user.email })

    // 認証コードをトークンに交換
    console.log('Exchanging code for tokens...')
    const authResponse = await youtubeClient.handleAuthCallback(code)
    
    console.log('Token exchange successful:', {
      hasAccessToken: !!authResponse.access_token,
      hasRefreshToken: !!authResponse.refresh_token
    })

    // トークンをデータベースに保存
    console.log('Saving tokens to database...')
    await YouTubeTokenManager.saveToken(
      user.id,
      authResponse.refresh_token,
      authResponse.access_token
    )

    console.log('YouTube authentication completed successfully for user:', user.id)

    // 成功時のリダイレクト
    return redirectToSuccess()

  } catch (error: any) {
    console.error('YouTube callback error:', error)
    return redirectToError('Authentication failed', error.message)
  }
}

function redirectToSuccess(): NextResponse {
  const baseUrl = getBaseUrl()
  const redirectUrl = `${baseUrl}/platforms?youtube_auth=success`
  console.log('Redirecting to success:', redirectUrl)
  return NextResponse.redirect(redirectUrl)
}

function redirectToError(message: string, details: string): NextResponse {
  const baseUrl = getBaseUrl()
  const redirectUrl = `${baseUrl}/platforms?youtube_auth=error&error=${encodeURIComponent(message)}&details=${encodeURIComponent(details)}`
  console.log('Redirecting to error:', redirectUrl)
  return NextResponse.redirect(redirectUrl)
}

function getBaseUrl(): string {
  return process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_APP_URL || 'https://blogpostplatform-production.up.railway.app'
    : 'http://localhost:3000'
} 