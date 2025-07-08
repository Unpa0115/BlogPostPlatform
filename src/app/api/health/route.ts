import { NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET() {
  try {
    const startTime = Date.now()
    
    // メモリ使用量を取得
    const memoryUsage = process.memoryUsage()
    const memoryUsageMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024),
    }
    
    // CPU使用率情報
    const cpuUsage = process.cpuUsage()
    
    // アップタイム
    const uptime = process.uptime()
    
    // データベース接続テスト
    let dbStatus = 'disconnected'
    let dbLatency = 0
    try {
      const dbStart = Date.now()
      
      // SQLite
      const sqliteDb = await db
      await sqliteDb.get('SELECT datetime("now") as current_time')
      
      dbLatency = Date.now() - dbStart
      dbStatus = 'connected'
    } catch (error) {
      console.error('Database health check failed:', error)
      dbStatus = 'error'
    }
    
    // 環境変数チェック
    const requiredEnvVars = [
      'JWT_SECRET',
      'ENCRYPTION_MASTER_KEY',
      'YOUTUBE_CLIENT_ID',
      'YOUTUBE_CLIENT_SECRET'
    ]
    
    const envStatus = requiredEnvVars.map(envVar => ({
      name: envVar,
      exists: !!process.env[envVar],
      length: process.env[envVar]?.length || 0
    }))
    
    const totalLatency = Date.now() - startTime
    
    const healthData = {
      status: 'healthy' as const,
      timestamp: new Date().toISOString(),
      uptime: Math.round(uptime),
      memory: memoryUsageMB,
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      database: {
        status: dbStatus,
        latency: dbLatency
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        platform: process.platform,
        nodeVersion: process.version,
        variables: envStatus
      },
      latency: totalLatency,
      pid: process.pid,
      // メモリ警告レベルの判定
      warnings: [] as string[]
    }
    
    // メモリ使用量の警告チェック
    if (memoryUsageMB.rss > 400) {
      healthData.warnings.push(`High RSS memory usage: ${memoryUsageMB.rss}MB`)
    }
    
    if (memoryUsageMB.heapUsed > 200) {
      healthData.warnings.push(`High heap memory usage: ${memoryUsageMB.heapUsed}MB`)
    }
    
    if (dbLatency > 1000) {
      healthData.warnings.push(`High database latency: ${dbLatency}ms`)
    }
    
    // 環境変数の不足チェック
    const missingEnvVars = envStatus.filter(env => !env.exists)
    if (missingEnvVars.length > 0) {
      healthData.warnings.push(`Missing environment variables: ${missingEnvVars.map(env => env.name).join(', ')}`)
    }
    
    return NextResponse.json(healthData, { status: 200 })
    
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
} 