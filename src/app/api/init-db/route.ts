import { NextResponse } from 'next/server'
import { createTables, testConnection } from '@/lib/database'
import { registerUser, getUserById } from '@/lib/auth'

export async function POST() {
  try {
    console.log('=== MANUAL DATABASE INITIALIZATION START ===')
    
    // 接続テスト
    const connectionTest = await testConnection()
    console.log('Connection test result:', connectionTest)
    
    if (connectionTest && connectionTest.success) {
      // テーブル作成
      await createTables()
      
      // デフォルトユーザーの作成
      const defaultUserId = '10699750-312a-4f82-ada7-c8e5cf9b1fa8'
      let defaultUser = await getUserById(defaultUserId)
      
      if (!defaultUser) {
        console.log('Creating default user...')
        try {
          defaultUser = await registerUser('default@example.com', 'defaultpassword123')
          console.log('Default user created:', defaultUser.email)
        } catch (error) {
          console.error('Failed to create default user:', error)
          // ユーザー作成に失敗しても、テーブル作成は成功しているので続行
        }
      } else {
        console.log('Default user already exists:', defaultUser.email)
      }
      
      return NextResponse.json({
        success: true,
        message: 'Database initialized successfully',
        connection: connectionTest,
        defaultUser: defaultUser ? {
          id: defaultUser.id,
          email: defaultUser.email,
          created: !!defaultUser
        } : null
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Database connection failed',
        error: connectionTest
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Manual database initialization failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Database initialization failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const connectionTest = await testConnection()
    
    // デフォルトユーザーの確認
    const defaultUserId = '10699750-312a-4f82-ada7-c8e5cf9b1fa8'
    const defaultUser = await getUserById(defaultUserId)
    
    return NextResponse.json({
      success: true,
      connection: connectionTest,
      defaultUser: defaultUser ? {
        id: defaultUser.id,
        email: defaultUser.email,
        exists: true
      } : {
        id: defaultUserId,
        exists: false
      }
    })
  } catch (error) {
    console.error('Database connection test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 