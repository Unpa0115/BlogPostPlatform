import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'uploads':
        // 全アップロードの一覧を取得
        const uploads = await storage.getAllUploads()
        return NextResponse.json({
          success: true,
          data: {
            total: uploads.length,
            uploads: uploads.map(u => ({
              id: u.id,
              title: u.title,
              file_path: u.file_path,
              status: u.status,
              created_at: u.created_at
            }))
          }
        })

      case 'upload':
        // 特定のアップロードを取得
        const uploadId = searchParams.get('id')
        if (!uploadId) {
          return NextResponse.json({ error: 'Upload ID required' }, { status: 400 })
        }
        
        const upload = await storage.getUpload(uploadId)
        return NextResponse.json({
          success: true,
          data: upload
        })

      case 'stats':
        // データベース統計を取得
        const stats = await storage.getStats(user.id)
        return NextResponse.json({
          success: true,
          data: stats
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({ 
      error: 'Debug API failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 