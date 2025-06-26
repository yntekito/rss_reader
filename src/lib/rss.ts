import RSSParser from 'rss-parser';
import { feedQueries, articleQueries, Feed } from './db';
import { processUndownloadedArticles } from './contentDownloader';

const parser = new RSSParser({
  customFields: {
    feed: ['language', 'copyright'],
    item: ['content:encoded', 'category']
  }
});

export interface ParsedFeed {
  title: string;
  description?: string;
  items: ParsedArticle[];
}

export interface ParsedArticle {
  title: string;
  description?: string;
  content?: string;
  link: string;
  pubDate?: string;
}

export async function parseFeedUrl(url: string): Promise<ParsedFeed> {
  try {
    // Validate URL format
    try {
      new URL(url);
    } catch {
      throw new Error('無効なURL形式です');
    }

    console.log('Fetching RSS feed from:', url);
    
    // First, manually fetch the URL to check what we're getting
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RSS Reader Bot/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    
    console.log('Response content-type:', contentType);
    console.log('Response text preview:', text.substring(0, 200));
    
    // Check if we got HTML instead of XML
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      throw new Error('指定されたURLはHTMLページです。RSSフィードのURLを確認してください。');
    }
    
    // Check if it looks like XML
    if (!text.trim().startsWith('<?xml') && !text.trim().startsWith('<rss') && !text.trim().startsWith('<feed')) {
      throw new Error('指定されたURLは有効なRSSフィードではありません。');
    }
    
    // Now parse with rss-parser
    let feed;
    try {
      feed = await parser.parseString(text);
    } catch (parseError) {
      console.error('RSS parse error:', parseError);
      throw new Error('RSSフィードの解析に失敗しました。フィード形式が正しくない可能性があります。');
    }
    
    if (!feed || !feed.items || feed.items.length === 0) {
      throw new Error('RSSフィードにアイテムが含まれていません');
    }
    
    console.log('Successfully parsed RSS feed:', feed.title, 'with', feed.items.length, 'items');
    
    return {
      title: feed.title || 'Untitled Feed',
      description: feed.description,
      items: feed.items.map(item => ({
        title: item.title || 'Untitled Article',
        description: item.contentSnippet || item.content,
        content: (item as unknown as Record<string, unknown>)['content:encoded'] as string || item.content,
        link: item.link || '',
        pubDate: item.pubDate || item.isoDate,
      }))
    };
  } catch (error) {
    console.error('Error parsing RSS feed:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('RSSフィードの解析に失敗しました');
  }
}

export async function addFeed(url: string): Promise<number> {
  try {
    const parsedFeed = await parseFeedUrl(url);
    
    let result;
    try {
      result = feedQueries.insert.run(
        url,
        parsedFeed.title,
        parsedFeed.description || null
      );
    } catch (error: any) {
      if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('このフィードは既に登録されています');
      }
      throw error;
    }
    
    const feedId = Number(result.lastInsertRowid);
    
    for (const item of parsedFeed.items) {
      const existingArticle = articleQueries.findByLink.get(item.link);
      
      if (!existingArticle && item.link) {
        articleQueries.insert.run(
          feedId,
          item.title,
          item.description || null,
          item.content || null,
          item.link,
          item.pubDate || null
        );
      }
    }
    
    // Start background content download for new articles
    processUndownloadedArticles().catch(console.error);
    
    return feedId;
  } catch (error) {
    console.error('Error adding feed:', error);
    throw error;
  }
}

export async function refreshFeed(feedId: number): Promise<void> {
  try {
    const feed = feedQueries.getById.get(feedId) as Feed;
    if (!feed) {
      throw new Error('Feed not found');
    }
    
    const parsedFeed = await parseFeedUrl(feed.url);
    
    feedQueries.update.run(
      parsedFeed.title,
      parsedFeed.description || null,
      feedId
    );
    
    for (const item of parsedFeed.items) {
      const existingArticle = articleQueries.findByLink.get(item.link);
      
      if (!existingArticle && item.link) {
        articleQueries.insert.run(
          feedId,
          item.title,
          item.description || null,
          item.content || null,
          item.link,
          item.pubDate || null
        );
      }
    }
    
    // Start background content download for new articles
    processUndownloadedArticles().catch(console.error);
  } catch (error) {
    console.error('Error refreshing feed:', error);
    throw error;
  }
}

export async function refreshAllFeeds(): Promise<void> {
  try {
    const feeds = feedQueries.getAll.all() as Feed[];
    
    for (const feed of feeds) {
      try {
        await refreshFeed(feed.id);
      } catch (error) {
        console.error(`Error refreshing feed ${feed.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error refreshing all feeds:', error);
    throw error;
  }
}