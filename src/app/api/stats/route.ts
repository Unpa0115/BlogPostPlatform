import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { storage } from '@/lib/storage'

// localhost専用のデフォルトユーザーID
const LOCALHOST_USER_ID = 'localhost-user'

export async function GET(request: NextRequest) {
  try {
    // localhost専用設定のため、認証チェックをスキップ
    const userId = LOCALHOST_USER_ID

    // 統計情報を取得
    const stats = await storage.getStats(userId)

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Get stats error:', error)
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 })
  }
} 