import { NextRequest, NextResponse } from 'next/server'
import { youtubeClient } from '@/lib/youtubeClient'
import path from 'path'
import fs from 'fs/promises'

const UPLOAD_DIR = process.env.NODE_ENV === 'production'
  ? '/mnt/volume/uploads'
  : path.join(process.cwd(), 'uploads')

export async function POST(request: NextRequest) {
  console.log('=== YouTube Upload API Debug ===')
  
  try {
    const body = await request.json()
    console.log('Request body received:', {
      hasAccessToken: !!body.accessToken,
      hasRefreshToken: !!body.refreshToken,
      hasClientId: !!body.clientId,
      hasClientSecret: !!body.clientSecret,
      title: body.title,
      hasFilePath: !!body.filePath,
      mimeType: body.mimeType,
      privacyStatus: body.privacyStatus
    })
    
    // 必要なパラメータを取得
    const {
      accessToken,
      refreshToken,
      clientId,
      clientSecret,
      title,
      description,
      tags,
      categoryId,
      privacyStatus,
      filePath,
      mimeType
    } = body

    if (!refreshToken || !clientId || !clientSecret || !title || !filePath) {
      console.log('Missing required parameters:', {
        missing: {
          refreshToken: !refreshToken,
          clientId: !clientId,
          clientSecret: !clientSecret,
          title: !title,
          filePath: !filePath
        }
      })
      return NextResponse.json({ 
        error: 'Missing required parameters',
        required: ['refreshToken', 'clientId', 'clientSecret', 'title', 'filePath'],
        received: Object.keys(body)
      }, { status: 400 })
    }

    // ファイルパスを実際のファイルシステムパスに変換
    const actualFilePath = path.join(UPLOAD_DIR, filePath)
    console.log('File path resolution:', {
      originalPath: filePath,
      uploadDir: UPLOAD_DIR,
      actualFilePath: actualFilePath
    })
    
    // ファイルの存在確認
    try {
      const fileStats = await fs.stat(actualFilePath)
      console.log('File found:', {
        exists: true,
        size: fileStats.size,
        sizeInMB: (fileStats.size / (1024 * 1024)).toFixed(2) + ' MB'
      })
    } catch (error) {
      console.log('File not found:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        actualFilePath
      })
      return NextResponse.json({ 
        error: 'File not found',
        filePath: actualFilePath
      }, { status: 404 })
    }

    console.log('Starting YouTube upload with options:', {
      title,
      description: description?.substring(0, 100) + '...',
      tags: tags?.length || 0,
      categoryId,
      privacyStatus,
      mimeType: mimeType || 'audio/mpeg'
    })

    const video = await youtubeClient.uploadToYoutube({
      accessToken: accessToken || '', // 後方互換性のため
      refreshToken,
      clientId,
      clientSecret,
      title,
      description,
      tags,
      categoryId,
      privacyStatus,
      filePath: actualFilePath,
      mimeType: mimeType || 'audio/mpeg'
    })

    console.log('YouTube upload successful:', {
      videoId: video.id,
      title: video.snippet?.title,
      status: video.status
    })

    return NextResponse.json({ 
      success: true, 
      video,
      videoId: video.id
    }, { status: 200 })
  } catch (error) {
    console.error('YouTube upload error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    })
    return NextResponse.json({ 
      error: 'YouTube upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 