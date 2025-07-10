import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'

// localhost専用のデフォルトユーザーID
const LOCALHOST_USER_ID = 'localhost-user'

export async function POST(request: NextRequest) {
  try {
    // localhost専用設定のため、認証チェックをスキップ
    const userId = LOCALHOST_USER_ID

    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // URL形式の基本的な検証
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ 
        isValid: false, 
        error: 'Invalid URL format' 
      })
    }

    // RSS Feedの検証
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'BlogPostPlatform/1.0'
        },
        // タイムアウトを設定（5秒）
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok) {
        return NextResponse.json({ 
          isValid: false, 
          error: 'Failed to fetch RSS feed' 
        })
      }

      const contentType = response.headers.get('content-type')
      const text = await response.text()

      // RSS/XML形式の検証
      const isRss = text.includes('<rss') || 
                   text.includes('<feed') || 
                   text.includes('<xml') ||
                   (contentType && (
                     contentType.includes('application/rss+xml') ||
                     contentType.includes('application/xml') ||
                     contentType.includes('text/xml')
                   ))

      if (!isRss) {
        return NextResponse.json({ 
          isValid: false, 
          error: 'Not a valid RSS feed' 
        })
      }

      return NextResponse.json({ 
        isValid: true, 
        message: 'Valid RSS feed' 
      })

    } catch (error) {
      console.error('RSS validation error:', error)
      return NextResponse.json({ 
        isValid: false, 
        error: 'Failed to validate RSS feed' 
      })
    }

  } catch (error) {
    console.error('Validate RSS error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 