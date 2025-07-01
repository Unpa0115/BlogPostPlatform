import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = process.env.NODE_ENV === 'production'
  ? '/tmp/uploads'  // Railway環境では/tmpディレクトリを使用
  : path.join(process.cwd(), 'uploads')

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Uploads list API called')
    console.log('📁 Upload directory:', UPLOAD_DIR)
    
    // ディレクトリの存在確認
    try {
      await fs.access(UPLOAD_DIR)
    } catch (error) {
      console.log('❌ Upload directory not found, creating...')
      await fs.mkdir(UPLOAD_DIR, { recursive: true })
    }
    
    // ファイル一覧を取得
    const files = await fs.readdir(UPLOAD_DIR)
    
    // ファイル情報を取得
    const fileList = await Promise.all(
      files
        .filter(file => {
          const ext = path.extname(file).toLowerCase()
          return ['.mp3', '.wav', '.m4a', '.mp4', '.mov'].includes(ext)
        })
        .map(async (file) => {
          const filePath = path.join(UPLOAD_DIR, file)
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

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
} 