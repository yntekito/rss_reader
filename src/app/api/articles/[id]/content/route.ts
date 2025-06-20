import { NextRequest, NextResponse } from 'next/server';
import { articleQueries } from '@/lib/db';
import { JSDOM } from 'jsdom';

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

    if (!article.link) {
      return NextResponse.json({
        title: article.title,
        content: article.content || article.description || '',
        excerpt: article.description || '',
        isFullContent: false,
      });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(article.link, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RSS Reader Bot)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const dom = new JSDOM(html);
      const document = dom.window.document;

      let title = article.title;
      let content = '';
      let excerpt = article.description || '';

      // Extract title
      const titleElement = document.querySelector('title');
      if (titleElement) {
        title = titleElement.textContent?.trim() || title;
      }

      // Extract meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        excerpt = metaDescription.getAttribute('content') || excerpt;
      }

      // Content extraction selectors in order of preference
      const contentSelectors = [
        'article',
        '[role="main"]',
        '.post-content',
        '.entry-content',
        '.article-content',
        '.content',
        'main',
        '.post-body',
        '.story-body',
        '.article-body',
        '.news-content',
        '.content-body',
      ];

      let contentElement = null;
      for (const selector of contentSelectors) {
        contentElement = document.querySelector(selector);
        if (contentElement) break;
      }

      // Fallback: collect paragraphs
      if (!contentElement) {
        const paragraphs = document.querySelectorAll('p');
        if (paragraphs.length > 2) {
          contentElement = document.createElement('div');
          paragraphs.forEach(p => {
            if (p.textContent && p.textContent.trim().length > 50) {
              contentElement!.appendChild(p.cloneNode(true));
            }
          });
        }
      }

      if (contentElement) {
        // Remove unwanted elements
        const unwantedSelectors = [
          'script', 'style', 'nav', 'header', 'footer', 'aside',
          '.advertisement', '.ads', '.social-share', '.related-posts',
          '.comments', '.comment', '.sidebar', '.widget',
          '.social-media', '.newsletter', '.subscription',
          '[class*="ad-"]', '[id*="ad-"]', '[class*="social"]',
          '[class*="share"]', '[class*="related"]', '[class*="recommend"]'
        ];
        
        unwantedSelectors.forEach(selector => {
          const elements = contentElement!.querySelectorAll(selector);
          elements.forEach(el => el.remove());
        });

        content = contentElement.innerHTML;
        
        // Clean up remaining scripts and styles
        content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
        
        // Convert relative URLs to absolute
        if (article.link) {
          const baseUrl = new URL(article.link).origin;
          content = content.replace(/src="\/([^"]*?)"/g, `src="${baseUrl}/$1"`);
          content = content.replace(/href="\/([^"]*?)"/g, `href="${baseUrl}/$1"`);
        }
        
        // Check if we got meaningful content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const textLength = tempDiv.textContent?.length || 0;
        
        if (textLength < 100) {
          content = article.content || article.description || '';
        }
      } else {
        content = article.content || article.description || '';
      }

      return NextResponse.json({
        title: title,
        content: content,
        excerpt: excerpt,
        isFullContent: true,
        fetchedAt: new Date().toISOString(),
      });

    } catch (fetchError) {
      console.error('Error fetching article content:', fetchError);
      
      return NextResponse.json({
        title: article.title,
        content: article.content || article.description || '',
        excerpt: article.description || '',
        isFullContent: false,
        error: fetchError instanceof Error ? fetchError.message : 'Failed to fetch content',
      });
    }

  } catch (error) {
    console.error('Error in content API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch article content' },
      { status: 500 }
    );
  }
}