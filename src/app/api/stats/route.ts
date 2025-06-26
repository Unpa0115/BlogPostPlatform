import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/railway'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 統計情報を取得
    const [
      uploadsResult,
      jobsResult,
      completedJobsResult,
      failedJobsResult,
      activePlatformsResult
    ] = await Promise.all([
      // 総アップロード数
      db.query(
        'SELECT COUNT(*) as count FROM audio_files WHERE user_id = $1',
        [user.id]
      ),
      // 総ジョブ数
      db.query(
        'SELECT COUNT(*) as count FROM jobs WHERE user_id = $1',
        [user.id]
      ),
      // 完了ジョブ数
      db.query(
        'SELECT COUNT(*) as count FROM jobs WHERE user_id = $1 AND status = $2',
        [user.id, 'completed']
      ),
      // 失敗ジョブ数
      db.query(
        'SELECT COUNT(*) as count FROM jobs WHERE user_id = $1 AND status = $2',
        [user.id, 'failed']
      ),
      // アクティブプラットフォーム数
      db.query(
        'SELECT COUNT(*) as count FROM distribution_platforms WHERE user_id = $1 AND is_active = $2',
        [user.id, true]
      )
    ])

    const stats = {
      total_uploads: parseInt(uploadsResult.rows[0].count),
      total_jobs: parseInt(jobsResult.rows[0].count),
      completed_jobs: parseInt(completedJobsResult.rows[0].count),
      failed_jobs: parseInt(failedJobsResult.rows[0].count),
      active_platforms: parseInt(activePlatformsResult.rows[0].count)
    }

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Get stats error:', error)
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 })
  }
} 