import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { verifyAuth } from '@/lib/auth'

// ジョブ一覧取得
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')
    const jobType = searchParams.get('job_type')

    // SQLite
    const sqliteDb = await db
    let query = `
      SELECT j.id, j.job_type, j.status, j.progress, j.platform_type, j.error_message, j.created_at,
             af.file_name as audio_file_name
      FROM jobs j
      LEFT JOIN audio_files af ON j.audio_file_id = af.id
      WHERE j.user_id = ?
    `
    const params: any[] = [user.id]

    if (status) {
      query += ` AND j.status = ?`
      params.push(status)
    }

    if (jobType) {
      query += ` AND j.job_type = ?`
      params.push(jobType)
    }

    query += ` ORDER BY j.created_at DESC LIMIT ? OFFSET ?`
    params.push(limit, offset)

    const result = await sqliteDb.all(query, params)

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Get jobs error:', error)
    return NextResponse.json({ error: 'Failed to get jobs' }, { status: 500 })
  }
}

// ジョブ作成
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { audio_file_id, job_type, platform_type, options } = body

    if (!audio_file_id || !job_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 音声ファイルの存在確認
    const sqliteDb = await db
    const audioFileResult = await sqliteDb.get(
      'SELECT id FROM audio_files WHERE id = ? AND user_id = ?',
      [audio_file_id, user.id]
    )

    if (!audioFileResult) {
      return NextResponse.json({ error: 'Audio file not found' }, { status: 404 })
    }

    // ジョブ作成
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const createdAt = new Date().toISOString()
    
    await sqliteDb.run(`
      INSERT INTO jobs (id, user_id, audio_file_id, job_type, platform_type, status, progress, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?)
    `, [jobId, user.id, audio_file_id, job_type, platform_type || null, createdAt, createdAt])

    const job = {
      id: jobId,
      job_type,
      status: 'pending',
      progress: 0,
      created_at: createdAt
    }

    // 非同期でジョブ処理を開始
    if (job_type === 'upload_to_platform' && platform_type) {
      // プラットフォームアップロードジョブ
      processPlatformUpload(job.id, audio_file_id, platform_type, options)
    } else if (job_type === 'transcribe') {
      // 文字起こしジョブ
      processTranscription(job.id, audio_file_id, options)
    } else if (job_type === 'summarize') {
      // 要約ジョブ
      processSummarization(job.id, audio_file_id, options)
    }

    return NextResponse.json({
      success: true,
      data: {
        id: job.id,
        job_type: job.job_type,
        status: job.status,
        progress: job.progress
      }
    })

  } catch (error) {
    console.error('Create job error:', error)
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }
}

// プラットフォームアップロード処理（非同期）
async function processPlatformUpload(jobId: string, audioFileId: string, platformType: string, options: any) {
  try {
    // ジョブステータスを処理中に更新
    const sqliteDb = await db
    await sqliteDb.run(
      'UPDATE jobs SET status = ?, progress = ? WHERE id = ?',
      ['processing', 10, jobId]
    )

    // 音声ファイル情報取得
    const audioFileResult = await sqliteDb.get(
      'SELECT file_url, file_name FROM audio_files WHERE id = ?',
      [audioFileId]
    )
    const audioFile = audioFileResult

    // プラットフォーム別の処理
    if (platformType === 'voicy') {
      await processVoicyUpload(jobId, audioFile, options)
    } else if (platformType === 'youtube') {
      await processYouTubeUpload(jobId, audioFile, options)
    } else if (platformType === 'spotify') {
      await processSpotifyUpload(jobId, audioFile, options)
    }

  } catch (error: any) {
    console.error('Platform upload error:', error)
    const sqliteDb = await db
    await sqliteDb.run(
      'UPDATE jobs SET status = ?, error_message = ? WHERE id = ?',
      ['failed', error.message, jobId]
    )
  }
}

// Voicyアップロード処理
async function processVoicyUpload(jobId: string, audioFile: any, options: any) {
  // TODO: Browserless.ioを使用したVoicy自動アップロード実装
  const sqliteDb = await db
  await sqliteDb.run(
    'UPDATE jobs SET status = ?, progress = ? WHERE id = ?',
    ['completed', 100, jobId]
  )
}

// YouTubeアップロード処理
async function processYouTubeUpload(jobId: string, audioFile: any, options: any) {
  // TODO: YouTube Data APIを使用したアップロード実装
  const sqliteDb = await db
  await sqliteDb.run(
    'UPDATE jobs SET status = ?, progress = ? WHERE id = ?',
    ['completed', 100, jobId]
  )
}

// Spotifyアップロード処理
async function processSpotifyUpload(jobId: string, audioFile: any, options: any) {
  // TODO: Spotify APIを使用したアップロード実装
  const sqliteDb = await db
  await sqliteDb.run(
    'UPDATE jobs SET status = ?, progress = ? WHERE id = ?',
    ['completed', 100, jobId]
  )
}

// 文字起こし処理（非同期）
async function processTranscription(jobId: string, audioFileId: string, options: any) {
  try {
    const sqliteDb = await db
    await sqliteDb.run(
      'UPDATE jobs SET status = ?, progress = ? WHERE id = ?',
      ['processing', 10, jobId]
    )

    // TODO: OpenAI Whisper APIを使用した文字起こし実装
    await sqliteDb.run(
      'UPDATE jobs SET status = ?, progress = ? WHERE id = ?',
      ['completed', 100, jobId]
    )

  } catch (error: any) {
    console.error('Transcription error:', error)
    const sqliteDb = await db
    await sqliteDb.run(
      'UPDATE jobs SET status = ?, error_message = ? WHERE id = ?',
      ['failed', error.message, jobId]
    )
  }
}

// 要約処理（非同期）
async function processSummarization(jobId: string, audioFileId: string, options: any) {
  try {
    const sqliteDb = await db
    await sqliteDb.run(
      'UPDATE jobs SET status = ?, progress = ? WHERE id = ?',
      ['processing', 10, jobId]
    )

    // TODO: GPT-4o-miniを使用した要約実装
    await sqliteDb.run(
      'UPDATE jobs SET status = ?, progress = ? WHERE id = ?',
      ['completed', 100, jobId]
    )

  } catch (error: any) {
    console.error('Summarization error:', error)
    const sqliteDb = await db
    await sqliteDb.run(
      'UPDATE jobs SET status = ?, error_message = ? WHERE id = ?',
      ['failed', error.message, jobId]
    )
  }
} 