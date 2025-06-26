import { NextRequest, NextResponse } from 'next/server'
import { generateSpotifyRssFeed } from '@/lib/rssGenerator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, siteUrl, feedUrl, author, items, outputPath } = body
    if (!title || !description || !siteUrl || !feedUrl || !author || !items || !outputPath) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }
    const xml = generateSpotifyRssFeed({ title, description, siteUrl, feedUrl, author, items, outputPath })
    return NextResponse.json({ success: true, outputPath })
  } catch (error) {
    console.error('RSS Feed error:', error)
    return NextResponse.json({ error: 'RSS Feed failed' }, { status: 500 })
  }
} 