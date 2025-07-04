import { NextRequest, NextResponse } from 'next/server';
import { RssGenerator } from '@/lib/rss-generator';

export async function GET(request: NextRequest) {
  try {
    const rssGenerator = new RssGenerator();
    const feedUrl = rssGenerator.getFeedUrl();
    
    return NextResponse.json({
      success: true,
      data: {
        feedUrl: feedUrl,
        environment: process.env.NODE_ENV,
        localhostEnabled: process.env.LOCALHOST_RSS_ENABLED === 'true'
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to get RSS feed info:', error);
    return NextResponse.json(
      { error: 'Failed to get RSS feed info' },
      { status: 500 }
    );
  }
} 