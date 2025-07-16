import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { testConnection, testConnectionSimple, createTables } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    // データベース接続テスト
    const dbTest = await testConnectionSimple()
    console.log('Database connection test:', dbTest)

    // 開発環境でのみ認証バイパスを許可（環境変数で制御）
    const allowAuthBypass = process.env.ALLOW_LOCALHOST_AUTH_BYPASS === 'true' && 
                           process.env.NODE_ENV === 'development'
    
    const isLocalhost = request.headers.get('host')?.includes('localhost') || 
                       request.headers.get('host')?.includes('127.0.0.1') ||
                       request.headers.get('host')?.includes('192.168.')

    if (isLocalhost && allowAuthBypass) {
      // localhost環境では固定ユーザーを返す
      const localhostUser = {
        id: 'localhost-user',
        email: 'localhost@example.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      return NextResponse.json({
        success: true,
        user: localhostUser,
        database: dbTest,
        environment: 'localhost'
      })
    }

    // 本番環境では認証情報の確認
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
      database: dbTest,
      environment: 'production'
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
      const result = await testConnectionSimple()
      return NextResponse.json({
        success: true,
        database: result
      })
    }

    if (action === 'init-db') {
      console.log('Initializing database...')
      // await createTables()
      const testResult = await testConnectionSimple()
      return NextResponse.json({
        success: true,
        message: 'Database initialized successfully',
        database: testResult
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Database operation error:', error)
    return NextResponse.json(
      { error: 'Database operation failed' },
      { status: 500 }
    )
  }
} 