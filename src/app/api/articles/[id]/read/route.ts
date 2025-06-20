import { NextRequest, NextResponse } from 'next/server';
import { articleQueries } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const articleId = parseInt(id);
    
    if (isNaN(articleId)) {
      return NextResponse.json(
        { error: 'Invalid article ID' },
        { status: 400 }
      );
    }
    
    articleQueries.markAsRead.run(articleId);
    
    return NextResponse.json({ message: 'Article marked as read' });
  } catch (error) {
    console.error('Error marking article as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark article as read' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const articleId = parseInt(id);
    
    if (isNaN(articleId)) {
      return NextResponse.json(
        { error: 'Invalid article ID' },
        { status: 400 }
      );
    }
    
    articleQueries.markAsUnread.run(articleId);
    
    return NextResponse.json({ message: 'Article marked as unread' });
  } catch (error) {
    console.error('Error marking article as unread:', error);
    return NextResponse.json(
      { error: 'Failed to mark article as unread' },
      { status: 500 }
    );
  }
}