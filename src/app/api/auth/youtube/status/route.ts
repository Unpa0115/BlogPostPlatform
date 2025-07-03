import { NextRequest, NextResponse } from 'next/server'
import { YouTubeTokenManager } from '@/lib/youtube-token-manager'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // ユーザー認証チェック
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Please login to check YouTube auth status'
      }, { status: 401 })
    }

    console.log('Checking YouTube auth status for user:', user.id)

    // tokenの期限をチェック
    const tokenCheck = await YouTubeTokenManager.checkTokenExpiry(user.id)
    
    // 期限切れ間近の場合は通知を作成
    if (tokenCheck.status === 'warning' || tokenCheck.needsReauth) {
      await YouTubeTokenManager.checkAndNotifyReauth(user.id)
    }

    console.log('YouTube token status:', tokenCheck)

    return NextResponse.json({
      success: true,
      userId: user.id,
      tokenStatus: {
        isValid: tokenCheck.isValid,
        daysUntilExpiry: tokenCheck.daysUntilExpiry,
        status: tokenCheck.status,
        needsReauth: tokenCheck.needsReauth
      }
    })

  } catch (error: any) {
    console.error('Error checking YouTube auth status:', error)
    return NextResponse.json({ 
      error: 'Failed to check auth status',
      details: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // ユーザー認証チェック
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Please login to check expiring tokens'
      }, { status: 401 })
    }

    console.log('Checking expiring tokens for user:', user.id)

    // 期限切れ間近のtokenを検索
    const expiringTokens = await YouTubeTokenManager.getExpiringTokens()
    
    // 該当ユーザーのtokenが含まれているかチェック
    const userToken = expiringTokens.find(token => token.user_id === user.id)
    
    if (userToken) {
      // 通知を作成
      await YouTubeTokenManager.createAuthNotification(
        user.id,
        'youtube',
        'TOKEN_EXPIRING',
        'YouTube認証の期限が間もなく切れます。事前に再認証をお勧めします。',
        `/platforms?reauth=youtube`
      )
      console.log('Expiring token notification created for user:', user.id)
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      hasExpiringToken: !!userToken,
      expiringTokensCount: expiringTokens.length
    })

  } catch (error: any) {
    console.error('Error checking expiring tokens:', error)
    return NextResponse.json({ 
      error: 'Failed to check expiring tokens',
      details: error.message
    }, { status: 500 })
  }
} 