import { NextResponse } from 'next/server'
import { createTables, testConnection } from '@/lib/database'

export async function POST() {
  try {
    console.log('=== MANUAL DATABASE INITIALIZATION START ===')
    
    // 接続テスト
    const connectionTest = await testConnection()
    console.log('Connection test result:', connectionTest)
    
    if (connectionTest && connectionTest.status === 'connected') {
      // テーブル作成
      await createTables()
      
      return NextResponse.json({
        success: true,
        message: 'Database initialized successfully',
        connection: connectionTest
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
    
    return NextResponse.json({
      success: true,
      connection: connectionTest
    })
  } catch (error) {
    console.error('Database connection test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 