import { NextRequest, NextResponse } from 'next/server'
import { RssGenerator } from '@/lib/rss-generator'
import { promises as fs } from 'fs'
import path from 'path'

// CORS ヘッダーを設定するヘルパー関数
function setCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  response.headers.set('Access-Control-Allow-Credentials', 'false')
  response.headers.set('Access-Control-Max-Age', '86400')
  return response
}

export async function GET(request: NextRequest) {
  try {
    const rssGenerator = new RssGenerator()
    const feedPath = rssGenerator.getFeedPath()
    
    // Check if feed file exists
    try {
      await fs.access(feedPath)
    } catch (error) {
      // Feed doesn't exist, generate it
      console.log('📡 Generating initial unified RSS feed...')
      await rssGenerator.regenerateFeed()
    }
    
    // Read and return the feed
    const feedContent = await fs.readFile(feedPath, 'utf8')
    
    const response = new NextResponse(feedContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    })
    
    return setCorsHeaders(response)
    
  } catch (error) {
    console.error('❌ Failed to serve RSS feed:', error)
    const response = NextResponse.json(
      { error: 'Failed to generate RSS feed' },
      { status: 500 }
    )
    
    return setCorsHeaders(response)
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== RSS API POST Debug ===')
    const body = await request.json()
    console.log('Request body:', body)
    console.log('Request origin:', request.headers.get('origin'))
    
    const { uploadId, userId, action, title, description, filePath, mimeType, testMode } = body
    
    // テストモード：手動でエピソードを追加
    if (testMode === true) {
      console.log('🧪 Test mode: Adding manual episode to RSS feed...')
      const rssGenerator = new RssGenerator()
      
      // テスト用エピソードデータを作成
      const testEpisodeData = {
        title: title || `Test Episode - ${new Date().toISOString()}`,
        description: description || 'This is a test episode added from localhost environment',
        filePath: filePath || 'test-audio.mp3',
        publishDate: new Date().toISOString(),
        fileSize: 367, // テスト用のファイルサイズ
        mimeType: mimeType || 'audio/mpeg'
      }
      
      console.log('📝 Test episode data:', testEpisodeData)
      await rssGenerator.addEpisodeToFeed(testEpisodeData)
      
      const response = NextResponse.json(
        { message: 'Test episode added to RSS feed successfully', episode: testEpisodeData },
        { status: 200 }
      )
      
      return setCorsHeaders(response)
    }
    
    // 再生成アクションの処理
    if (action === 'regenerate') {
      console.log('🔄 Regenerating RSS feed...')
      const rssGenerator = new RssGenerator()
      await rssGenerator.regenerateFeed()
      console.log('✅ RSS feed regenerated successfully')
      
      const response = NextResponse.json(
        { message: 'RSS feed regenerated successfully' },
        { status: 200 }
      )
      
      return setCorsHeaders(response)
    }
    
    if (!uploadId) {
      console.log('Missing uploadId')
      const response = NextResponse.json(
        { error: 'uploadId is required' },
        { status: 400 }
      )
      
      return setCorsHeaders(response)
    }
    
    console.log('Processing uploadId:', uploadId)
    console.log('🔍 Adding episode to RSS feed:', uploadId)
    
    const rssGenerator = new RssGenerator()
    
    // ファイル名かUUIDかを判定して適切に処理
    if (uploadId.includes('.mp3') || uploadId.includes('.wav') || uploadId.includes('.m4a')) {
      // ファイル名の場合、userIdが必要
      if (!userId) {
        const response = NextResponse.json(
          { error: 'userId is required when using file name as uploadId' },
          { status: 400 }
        )
        
        return setCorsHeaders(response)
      }
      await rssGenerator.addEpisode(uploadId, userId)
    } else {
      // UUIDの場合
      await rssGenerator.addEpisode(uploadId)
    }
    
    console.log('✅ Episode added successfully to RSS feed')
    const response = NextResponse.json(
      { message: 'Episode added to unified RSS feed successfully' },
      { status: 200 }
    )
    
    return setCorsHeaders(response)
    
  } catch (error) {
    console.error('❌ Failed to add episode to RSS feed:', error)
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
    
    const response = NextResponse.json(
      { error: 'Failed to add episode to RSS feed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
    
    return setCorsHeaders(response)
  }
}

// OPTIONSリクエスト（プリフライト）に対応
export async function OPTIONS(request: NextRequest) {
  console.log('=== CORS Preflight Request ===')
  console.log('Origin:', request.headers.get('origin'))
  console.log('Access-Control-Request-Method:', request.headers.get('access-control-request-method'))
  console.log('Access-Control-Request-Headers:', request.headers.get('access-control-request-headers'))
  
  const response = new NextResponse(null, { status: 200 })
  return setCorsHeaders(response)
} 