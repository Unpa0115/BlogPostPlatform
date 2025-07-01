import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { testConnection } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    // データベース接続テスト
    const dbTest = await testConnection()
    console.log('Database connection test:', dbTest)

    // 認証情報の確認
    const user = await verifyAuth(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user,
      database: dbTest
    })

  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// データベース接続テスト専用エンドポイント
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'test-db') {
      const result = await testConnection()
      return NextResponse.json({
        success: true,
        database: result
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json(
      { error: 'Database test failed' },
      { status: 500 }
    )
  }
} 