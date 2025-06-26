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
    
    const articles = articleQueries.getAll.all() as { 
      id: number; 
      title: string; 
      content?: string; 
      description?: string; 
      full_content?: string;
      content_downloaded: boolean;
      featured_image?: string;
      link?: string;
    }[];
    const article = articles.find(a => a.id === articleId);
    
    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // If we have downloaded content, use it; otherwise use RSS content
    const hasFullContent = article.content_downloaded && article.full_content;
    
    return NextResponse.json({
      title: article.title,
      content: hasFullContent ? article.full_content : (article.content || article.description || ''),
      excerpt: article.description || '',
      isRssOnly: !hasFullContent,
      isFullContent: hasFullContent,
      featuredImage: article.featured_image,
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