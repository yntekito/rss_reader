import { NextRequest, NextResponse } from 'next/server';
import { articleQueries } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const feedId = searchParams.get('feedId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    
    console.log('Articles API called with feedId:', feedId, 'unreadOnly:', unreadOnly);
    
    let articles;
    
    if (feedId && unreadOnly) {
      // Get unread articles for specific feed
      articles = articleQueries.getUnreadByFeedId.all(parseInt(feedId));
    } else if (unreadOnly) {
      // Get all unread articles
      articles = articleQueries.getUnread.all();
    } else if (feedId) {
      // Get all articles for specific feed
      articles = articleQueries.getByFeedId.all(parseInt(feedId));
    } else {
      // Get all articles
      articles = articleQueries.getAll.all();
    }
    
    console.log('Fetched', articles.length, 'articles for feedId:', feedId, 'unreadOnly:', unreadOnly);
    
    return NextResponse.json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}