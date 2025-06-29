import { NextRequest, NextResponse } from 'next/server';
import { spotifyService } from '@/lib/spotify-service';

export async function GET(request: NextRequest) {
  try {
    const feedInfo = spotifyService.getRssFeedInfo();
    
    return NextResponse.json({
      success: true,
      data: feedInfo
    });
    
  } catch (error) {
    console.error('❌ Failed to get RSS feed info:', error);
    return NextResponse.json(
      { error: 'Failed to get RSS feed info' },
      { status: 500 }
    );
  }
} 