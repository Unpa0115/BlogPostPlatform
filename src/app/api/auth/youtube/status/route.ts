import { NextRequest, NextResponse } from 'next/server'
import { YouTubeTokenManager } from '@/lib/youtube-token-manager'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    // tokenの期限をチェック
    const tokenCheck = await YouTubeTokenManager.checkTokenExpiry(userId)
    
    // 期限切れ間近の場合は通知を作成
    if (tokenCheck.status === 'warning' || tokenCheck.needsReauth) {
      await YouTubeTokenManager.checkAndNotifyReauth(userId)
    }

    return NextResponse.json({
      success: true,
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
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    // 期限切れ間近のtokenを検索
    const expiringTokens = await YouTubeTokenManager.getExpiringTokens()
    
    // 該当ユーザーのtokenが含まれているかチェック
    const userToken = expiringTokens.find(token => token.user_id === userId)
    
    if (userToken) {
      // 通知を作成
      await YouTubeTokenManager.createAuthNotification(
        userId,
        'youtube',
        'TOKEN_EXPIRING',
        'YouTube認証の期限が間もなく切れます。事前に再認証をお勧めします。',
        `/platforms?reauth=youtube`
      )
    }

    return NextResponse.json({
      success: true,
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