import { NextResponse } from 'next/server'
import { updateConstraints, testConnection } from '@/lib/database'

export async function POST() {
  try {
    console.log('=== MANUAL CONSTRAINT UPDATE START ===')
    
    // 接続テスト
    const connectionTest = await testConnection()
    console.log('Connection test result:', connectionTest)
    
    if (connectionTest && connectionTest.status === 'connected') {
      // 制約更新
      await updateConstraints()
      
      return NextResponse.json({
        success: true,
        message: 'Constraints updated successfully',
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
    console.error('Manual constraint update failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Constraint update failed',
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