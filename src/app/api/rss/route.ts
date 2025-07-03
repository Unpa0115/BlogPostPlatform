import { NextRequest, NextResponse } from 'next/server'
import { RssGenerator } from '@/lib/rss-generator'
import { promises as fs } from 'fs'
import path from 'path'

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
    
    return new NextResponse(feedContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    })
    
  } catch (error) {
    console.error('❌ Failed to serve RSS feed:', error)
    return NextResponse.json(
      { error: 'Failed to generate RSS feed' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== RSS API POST Debug ===')
    const body = await request.json()
    console.log('Request body:', body)
    
    const { uploadId } = body
    
    if (!uploadId) {
      console.log('Missing uploadId')
      return NextResponse.json(
        { error: 'uploadId is required' },
        { status: 400 }
      )
    }
    
    console.log('Processing uploadId:', uploadId)
    
    const rssGenerator = new RssGenerator()
    await rssGenerator.addEpisode(uploadId)
    
    console.log('Episode added successfully')
    return NextResponse.json(
      { message: 'Episode added to unified RSS feed successfully' },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('❌ Failed to add episode to RSS feed:', error)
    return NextResponse.json(
      { error: 'Failed to add episode to RSS feed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 