import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/railway'
import { railwayStorage } from '@/lib/railway'
import { verifyAuth } from '@/lib/auth'

// ファイルアップロード
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const metadata = formData.get('metadata') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // ファイル形式チェック
    const allowedMimes = [
      'video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/wmv',
      'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/mpeg',
      'audio/mp4', 'audio/x-m4a', 'audio/x-mpeg-3', 'audio/mpeg3'
    ]

    if (!allowedMimes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // ファイルサイズチェック（2GB制限）
    if (file.size > 2 * 1024 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    // ファイル名生成
    const timestamp = Date.now()
    const fileName = `${user.id}/${timestamp}_${file.name}`

    // Railway Storageにアップロード
    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadResult = await railwayStorage.upload(buffer, fileName, file.type)

    // データベースに記録
    const result = await db.query(`
      INSERT INTO audio_files (user_id, file_name, file_url, file_size, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, file_name, file_url, status
    `, [user.id, file.name, uploadResult.url, file.size, metadata || '{}'])

    const audioFile = result.rows[0]

    return NextResponse.json({
      success: true,
      data: {
        id: audioFile.id,
        file_name: audioFile.file_name,
        file_url: audioFile.file_url,
        status: audioFile.status
      }
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

// アップロード一覧取得
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

    const result = await db.query(`
      SELECT id, file_name, file_url, file_size, duration, status, metadata, created_at
      FROM audio_files
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [user.id, limit, offset])

    return NextResponse.json({
      success: true,
      data: result.rows
    })

  } catch (error) {
    console.error('Get uploads error:', error)
    return NextResponse.json({ error: 'Failed to get uploads' }, { status: 500 })
  }
} 