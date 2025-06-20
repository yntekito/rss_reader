import RSSParser from 'rss-parser';
import { feedQueries, articleQueries, Feed } from './db';

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
    const feed = await parser.parseURL(url);
    
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
    throw new Error(`Failed to parse RSS feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function addFeed(url: string): Promise<number> {
  try {
    const parsedFeed = await parseFeedUrl(url);
    
    const result = feedQueries.insert.run(
      url,
      parsedFeed.title,
      parsedFeed.description || null
    );
    
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