import { NextRequest, NextResponse } from 'next/server'
import { registerUser, loginUser } from '@/lib/auth'
import { createTables, testConnection } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    console.log('=== REGISTER API START ===')
    console.log('Environment:', process.env.NODE_ENV)
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
    
    const body = await request.json()
    const { email, password } = body
    console.log('Request body received:', { email, password: password ? '[HIDDEN]' : 'undefined' })

    if (!email || !password) {
      console.log('Validation failed: missing email or password')
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      console.log('Validation failed: password too short')
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // データベース接続テスト
    console.log('Testing database connection...')
    try {
      const dbTest = await testConnection()
      console.log('Database connection test result:', dbTest)
    } catch (dbTestError) {
      console.error('Database connection test failed:', dbTestError)
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      )
    }

    // データベーステーブルの初期化
    console.log('Initializing database tables...')
    try {
      await createTables()
      console.log('Database tables initialized successfully')
    } catch (dbError) {
      console.error('Database initialization error:', dbError)
      return NextResponse.json(
        { error: 'Database initialization failed' },
        { status: 500 }
      )
    }

    // ユーザー登録
    console.log('Starting user registration...')
    const user = await registerUser(email, password)
    console.log('User registered successfully:', { id: user.id, email: user.email })

    // 登録後すぐにログイン
    console.log('Starting login process...')
    const loginResult = await loginUser(email, password)
    console.log('Login result:', loginResult ? 'SUCCESS' : 'FAILED')

    if (!loginResult) {
      console.error('Login failed after successful registration')
      return NextResponse.json(
        { error: 'Registration successful but login failed' },
        { status: 500 }
      )
    }

    console.log('=== REGISTER API SUCCESS ===')
    return NextResponse.json({
      success: true,
      user: loginResult.user,
      token: loginResult.token
    })

  } catch (error: any) {
    console.error('=== REGISTER API ERROR ===')
    console.error('Register error:', error)
    console.error('Error stack:', error.stack)
    
    // SQLiteのUNIQUE制約エラー
    if (error.code === 'SQLITE_CONSTRAINT' && error.message?.includes('UNIQUE constraint failed: users.email')) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 409 }
      )
    }

    // PostgreSQLの重複エラー
    if (error.code === '23505' && error.constraint === 'users_email_key') {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 409 }
      )
    }

    // その他の重複エラー
    if (error.message?.includes('duplicate') || error.message?.includes('UNIQUE constraint')) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 