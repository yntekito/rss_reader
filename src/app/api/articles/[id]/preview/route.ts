import { NextRequest, NextResponse } from 'next/server';
import { articleQueries } from '@/lib/db';

export async function GET(
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
    
    const articles = articleQueries.getAll.all() as { id: number; title: string; content?: string; description?: string; link?: string }[];
    const article = articles.find(a => a.id === articleId);
    
    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Return RSS data immediately
    return NextResponse.json({
      title: article.title,
      content: article.content || article.description || '',
      excerpt: article.description || '',
      isRssOnly: true, // Flag to indicate this is RSS-only data
      link: article.link,
    });

  } catch (error) {
    console.error('Error in preview API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch article preview' },
      { status: 500 }
    );
  }
}