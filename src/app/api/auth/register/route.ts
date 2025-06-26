import { NextRequest, NextResponse } from 'next/server'
import { registerUser, loginUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // ユーザー登録
    const user = await registerUser(email, password)

    // 登録後すぐにログイン
    const loginResult = await loginUser(email, password)

    if (!loginResult) {
      return NextResponse.json(
        { error: 'Registration successful but login failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: loginResult.user,
      token: loginResult.token
    })

  } catch (error: any) {
    console.error('Register error:', error)
    
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