import { NextRequest, NextResponse } from 'next/server';
import { RssGenerator } from '@/lib/rss-generator';

export async function GET(request: NextRequest) {
  try {
    const rssGenerator = new RssGenerator();
    const archivedEpisodes = await rssGenerator.getArchivedEpisodesList();
    
    return NextResponse.json({
      success: true,
      data: archivedEpisodes
    });
    
  } catch (error) {
    console.error('❌ Failed to get archived episodes:', error);
    return NextResponse.json(
      { error: 'Failed to get archived episodes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { episodeId } = await request.json();
    
    if (!episodeId) {
      return NextResponse.json(
        { error: 'episodeId is required' },
        { status: 400 }
      );
    }
    
    const rssGenerator = new RssGenerator();
    const success = await rssGenerator.restoreEpisodeFromArchive(episodeId);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Episode restored from archive successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Episode not found in archive or restore failed' },
        { status: 404 }
      );
    }
    
  } catch (error) {
    console.error('❌ Failed to restore episode from archive:', error);
    return NextResponse.json(
      { error: 'Failed to restore episode from archive' },
      { status: 500 }
    );
  }
} 