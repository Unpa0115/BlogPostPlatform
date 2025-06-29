import { NextRequest, NextResponse } from 'next/server';
import { RssGenerator } from '@/lib/rss-generator';

export async function GET(request: NextRequest) {
  try {
    const rssGenerator = new RssGenerator();
    const stats = await rssGenerator.getFeedStats();
    
    return NextResponse.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('❌ Failed to get RSS feed stats:', error);
    return NextResponse.json(
      { error: 'Failed to get RSS feed stats' },
      { status: 500 }
    );
  }
} 