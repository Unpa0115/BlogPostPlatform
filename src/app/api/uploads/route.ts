import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { verifyAuth } from '@/lib/auth'
import { storage } from '@/lib/storage'
import { RssGenerator } from '@/lib/rss-generator'
import { safeDateToISOString } from '@/lib/utils'

const UPLOAD_DIR = process.env.NODE_ENV === 'production'
  ? '/app/uploads'  // Railway Storageのマウントパス
  : path.join(process.cwd(), 'uploads')

// localhost専用のデフォルトユーザーID
const LOCALHOST_USER_ID = 'localhost-user'

// ディレクトリ作成と権限設定のヘルパー関数
async function ensureUploadDirectory() {
  try {
    // ディレクトリの存在確認
    await fs.access(UPLOAD_DIR)
    console.log(`✅ Upload directory exists: ${UPLOAD_DIR}`)
  } catch (error) {
    console.log(`📁 Creating upload directory: ${UPLOAD_DIR}`)
    try {
      // ディレクトリを作成
      await fs.mkdir(UPLOAD_DIR, { recursive: true, mode: 0o755 })
      console.log(`✅ Upload directory created: ${UPLOAD_DIR}`)
    } catch (mkdirError) {
      console.error(`❌ Failed to create upload directory: ${mkdirError}`)
      // 代替ディレクトリを試す
      const fallbackDir = '/tmp/uploads'
      console.log(`🔄 Trying fallback directory: ${fallbackDir}`)
      await fs.mkdir(fallbackDir, { recursive: true, mode: 0o755 })
      return fallbackDir
    }
  }
  return UPLOAD_DIR
}

// ファイルアップロード
export async function POST(request: NextRequest) {
  try {
    // localhost専用設定のため、認証チェックをスキップ
    const userId = LOCALHOST_USER_ID

    const formData = await request.formData()
    const file = formData.get('file') as File
    const metadataRaw = formData.get('metadata') as string
    let metadata: Record<string, any> = {}
    try {
      metadata = metadataRaw ? JSON.parse(metadataRaw) : {}
    } catch {
      metadata = {}
    }

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

    // アップロードディレクトリの確保
    const uploadDir = await ensureUploadDirectory()
    console.log(`📁 Using upload directory: ${uploadDir}`)

    // ファイル名生成（ユーザーID＋タイムスタンプ＋元ファイル名）
    const timestamp = Date.now()
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `${userId}_${timestamp}_${safeFileName}`
    const filePath = path.join(uploadDir, fileName)
    const metadataPath = filePath + '.metadata.json'

    console.log(`📝 Saving file to: ${filePath}`)

    // ファイル保存
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(filePath, buffer, { mode: 0o644 })
    console.log(`✅ File saved successfully: ${fileName}`)

    // メタデータ保存
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), { mode: 0o644 })
    console.log(`✅ Metadata saved: ${fileName}.metadata.json`)

    // DBにアップロード情報を保存
    let upload;
    try {
      console.log(`💾 Saving upload to database: ${fileName}`)
      console.log(`📊 Upload data:`, {
        user_id: userId,
        title: metadata.title || file.name,
        description: metadata.description || '',
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        status: 'completed',
        metadata: metadata
      })
      
      upload = await storage.createUpload({
        user_id: userId,
        title: metadata.title || file.name,
        description: metadata.description || '',
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        status: 'completed',
        metadata: metadata
      })
      
      console.log(`✅ Upload saved to database:`, upload)
    } catch (dbError) {
      console.error('❌ DB保存エラー:', dbError)
      console.error('❌ DB保存エラー詳細:', {
        message: dbError instanceof Error ? dbError.message : String(dbError),
        stack: dbError instanceof Error ? dbError.stack : 'No stack trace',
        code: (dbError as any)?.code,
        detail: (dbError as any)?.detail
      })
      return NextResponse.json({ 
        error: 'DB保存に失敗しました', 
        details: dbError instanceof Error ? dbError.message : String(dbError) 
      }, { status: 500 })
    }

    // uploadオブジェクトの存在チェック
    if (!upload || !upload.id) {
      console.error('❌ Failed to create upload record in database')
      console.error('❌ Upload object:', upload)
      return NextResponse.json({ error: 'Failed to save upload information' }, { status: 500 })
    }

    console.log(`✅ Upload record created with ID: ${upload.id}`)

    // 音声・動画ファイルの場合、統合RSS Feedを更新
    if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
      try {
        console.log(`🎵 Audio/Video file detected, updating RSS feed for upload ID: ${upload.id}`)
        const rssGenerator = new RssGenerator()
        await rssGenerator.addEpisode(upload.id)
        console.log(`✅ Added audio/video file to unified RSS feed: ${upload.title}`)
      } catch (error) {
        console.error('❌ Failed to update RSS feed:', error)
        console.error('❌ RSS feed error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : 'No stack trace'
        })
        // RSS Feed更新の失敗はアップロード自体の失敗にはしない
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: upload.id,
        file_name: fileName,
        file_url: `/api/uploads?file=${encodeURIComponent(fileName)}`,
        status: 'completed',
        metadata,
        created_at: safeDateToISOString(upload.created_at) || new Date().toISOString(),
        file_size: file.size
      }
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

// ファイルダウンロード
export async function GET(request: NextRequest) {
  try {
    // localhost専用設定のため、認証チェックをスキップ
    const userId = LOCALHOST_USER_ID

    const { searchParams } = new URL(request.url)
    const fileName = searchParams.get('file')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    // ファイルダウンロード（fileパラメータ優先）
    if (fileName) {
      // パスの安全性確保
      if (fileName.includes('..')) {
        return NextResponse.json({ error: 'Invalid file name' }, { status: 400 })
      }
      const filePath = path.join(UPLOAD_DIR, fileName)
      try {
        const fileBuffer = await fs.readFile(filePath)
        // Content-Typeは簡易的にoctet-stream
        return new Response(fileBuffer, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${fileName}"`
          }
        })
      } catch {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
    }

    // ファイル一覧取得（limit, offsetパラメータがある場合）
    if (limit || offset) {
      await fs.mkdir(UPLOAD_DIR, { recursive: true })
      let files = await fs.readdir(UPLOAD_DIR)
      // ユーザーIDでフィルタ（ファイル名先頭がuser.id_で始まるもの、.metadata.jsonは除外）
      files = files.filter(f => f.startsWith(userId + '_') && !f.endsWith('.metadata.json'))
      // 新しい順（ファイル名にtimestampが含まれている前提）
      files.sort((a, b) => b.localeCompare(a))
      const lim = parseInt(limit || '10')
      const off = parseInt(offset || '0')
      const paged = files.slice(off, off + lim)
      // ファイル情報を返す（必要に応じて拡張）
      const fileInfos = await Promise.all(paged.map(async (f) => {
        const stat = await fs.stat(path.join(UPLOAD_DIR, f))
        let metadata = {}
        try {
          const metaRaw = await fs.readFile(path.join(UPLOAD_DIR, f + '.metadata.json'), 'utf-8')
          metadata = JSON.parse(metaRaw)
        } catch {}
        return {
          id: f,
          file_name: f,
          file_url: `/api/uploads?file=${encodeURIComponent(f)}`,
          file_size: stat.size,
          duration: null, // TODO: 音声長取得は後で
          status: 'uploading', // TODO: 状態管理は後で
          metadata,
          created_at: stat.birthtime
        }
      }))
      return NextResponse.json({ success: true, data: fileInfos })
    }

    // パラメータなしは400
    return NextResponse.json({ error: 'No file or list parameter' }, { status: 400 })
  } catch (error) {
    console.error('Download/List error:', error)
    return NextResponse.json({ error: 'Download/List failed' }, { status: 500 })
  }
}

// ファイル削除
export async function DELETE(request: NextRequest) {
  try {
    // 認証チェック
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fileName = searchParams.get('file')
    if (!fileName) {
      return NextResponse.json({ error: 'No file specified' }, { status: 400 })
    }
    // パスの安全性確保
    if (fileName.includes('..')) {
      return NextResponse.json({ error: 'Invalid file name' }, { status: 400 })
    }
    const filePath = path.join(UPLOAD_DIR, fileName)
    const metadataPath = filePath + '.metadata.json'

    // ファイル削除
    try {
      await fs.unlink(filePath)
    } catch (e) {
      // ファイルが存在しない場合も無視
    }
    try {
      await fs.unlink(metadataPath)
    } catch (e) {}

    // DBレコード削除
    try {
      await storage.deleteUploadByFilePath(filePath)
    } catch (e) {
      // DBレコードがなくても無視
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
} 