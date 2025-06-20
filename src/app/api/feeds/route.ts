import { NextRequest, NextResponse } from 'next/server';
import { feedQueries } from '@/lib/db';
import { addFeed, refreshAllFeeds } from '@/lib/rss';

export async function GET() {
  try {
    const feeds = feedQueries.getAll.all();
    return NextResponse.json(feeds);
  } catch (error) {
    console.error('Error fetching feeds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feeds' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }
    
    const feedId = await addFeed(url);
    const newFeed = feedQueries.getById.get(feedId);
    
    return NextResponse.json(newFeed, { status: 201 });
  } catch (error) {
    console.error('Error adding feed:', error);
    return NextResponse.json(
      { error: 'Failed to add feed' },
      { status: 500 }
    );
  }
}

export async function PUT() {
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