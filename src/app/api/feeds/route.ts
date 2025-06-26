import { NextRequest, NextResponse } from 'next/server';
import { feedQueries, articleQueries } from '@/lib/db';
import { addFeed, refreshAllFeeds } from '@/lib/rss';

export async function GET() {
  try {
    const feeds = feedQueries.getAll.all() as any[];
    
    if (!feeds || feeds.length === 0) {
      return NextResponse.json([]);
    }
    
    // Add unread count to each feed
    const feedsWithUnreadCount = feeds.map(feed => {
      try {
        const unreadCountResult = articleQueries.getUnreadCountByFeedId.get(feed.id) as { count: number } | undefined;
        return {
          ...feed,
          unreadCount: unreadCountResult?.count || 0
        };
      } catch (error) {
        console.error('Error getting unread count for feed', feed.id, error);
        return {
          ...feed,
          unreadCount: 0
        };
      }
    });
    
    return NextResponse.json(feedsWithUnreadCount);
  } catch (error) {
    console.error('Error fetching feeds:', error);
    return NextResponse.json(
      { error: `Failed to fetch feeds: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('POST /api/feeds called');
  try {
    console.log('Parsing request body...');
    const body = await request.json();
    console.log('Request body:', body);
    const { url } = body;
    
    if (!url) {
      console.log('No URL provided');
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }
    
    console.log('Adding feed with URL:', url);
    const feedId = await addFeed(url);
    console.log('Feed added with ID:', feedId);
    
    console.log('Fetching newly created feed...');
    const newFeed = feedQueries.getById.get(feedId);
    console.log('Feed added successfully:', newFeed);
    
    return NextResponse.json(newFeed, { status: 201 });
  } catch (error) {
    console.error('Error adding feed:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add feed' },
      { status: 500 }
    );
  }
}

export async function PUT() {
  console.log('PUT /api/feeds called');
  try {
    await refreshAllFeeds();
    return NextResponse.json({ message: 'All feeds refreshed successfully' });
  } catch (error) {
    console.error('Error refreshing feeds:', error);
    return NextResponse.json(
      { error: 'Failed to refresh feeds' },
      { status: 500 }
    );
  }
}