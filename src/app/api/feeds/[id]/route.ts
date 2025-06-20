import { NextRequest, NextResponse } from 'next/server';
import { feedQueries, articleQueries } from '@/lib/db';
import { refreshFeed } from '@/lib/rss';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const feedId = parseInt(id);
    
    if (isNaN(feedId)) {
      return NextResponse.json(
        { error: 'Invalid feed ID' },
        { status: 400 }
      );
    }
    
    articleQueries.deleteByFeedId.run(feedId);
    feedQueries.delete.run(feedId);
    
    return NextResponse.json({ message: 'Feed deleted successfully' });
  } catch (error) {
    console.error('Error deleting feed:', error);
    return NextResponse.json(
      { error: 'Failed to delete feed' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const feedId = parseInt(id);
    
    if (isNaN(feedId)) {
      return NextResponse.json(
        { error: 'Invalid feed ID' },
        { status: 400 }
      );
    }
    
    await refreshFeed(feedId);
    
    return NextResponse.json({ message: 'Feed refreshed successfully' });
  } catch (error) {
    console.error('Error refreshing feed:', error);
    return NextResponse.json(
      { error: 'Failed to refresh feed' },
      { status: 500 }
    );
  }
}