import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = process.env.NODE_ENV === 'production'
  ? '/app/uploads'  // Railway Storageのマウントパス
  : path.join(process.cwd(), 'uploads')

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

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Uploads list API called')
    
    // アップロードディレクトリの確保
    const uploadDir = await ensureUploadDirectory()
    console.log('📁 Upload directory:', uploadDir)
    
    // ファイル一覧を取得
    const files = await fs.readdir(uploadDir)
    
    // ファイル情報を取得
    const fileList = await Promise.all(
      files
        .filter(file => {
          const ext = path.extname(file).toLowerCase()
          return ['.mp3', '.wav', '.m4a', '.mp4', '.mov'].includes(ext)
        })
        .map(async (file) => {
          const filePath = path.join(uploadDir, file)
          const stats = await fs.stat(filePath)
          
          return {
            name: file,
            path: file, // 相対パス
            size: stats.size,
            sizeFormatted: formatFileSize(stats.size),
            modified: stats.mtime.toISOString(),
            type: path.extname(file).toLowerCase().substring(1)
          }
        })
    )
    
    // 更新日時でソート（新しい順）
    fileList.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
    
    console.log(`✅ Found ${fileList.length} files`)
    
    return NextResponse.json({
      success: true,
      data: fileList
    })
    
  } catch (error) {
    console.error('❌ Error reading uploads directory:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to read uploads directory',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ファイルサイズフォーマット関数
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
} 