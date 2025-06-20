import { NextRequest, NextResponse } from 'next/server';
import { articleQueries } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const feedId = searchParams.get('feedId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    
    let articles;
    
    if (unreadOnly) {
      articles = articleQueries.getUnread.all();
    } else if (feedId) {
      articles = articleQueries.getByFeedId.all(parseInt(feedId));
    } else {
      articles = articleQueries.getAll.all();
    }
    
    return NextResponse.json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}