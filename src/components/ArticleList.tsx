'use client';

import { useRef, useEffect, useState } from 'react';
import { Article } from '@/lib/db';

interface ArticleListProps {
  articles: Article[];
  loading: boolean;
  onArticleRead: (articleId: number) => void;
  onScrollBasedRead?: (articleId: number) => void;
  onArticleClick?: (article: Article) => void;
}

export default function ArticleList({ articles, loading, onArticleRead, onScrollBasedRead, onArticleClick }: ArticleListProps) {
  const markedAsReadRef = useRef<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const [localReadStatus, setLocalReadStatus] = useState<Set<number>>(new Set());

  useEffect(() => {
    const checkVisibleArticles = () => {
      if (!containerRef.current) return;
      
      const articleElements = containerRef.current.querySelectorAll('[data-article-id]');
      
      articleElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        // Check if article has scrolled past the top of the viewport
        if (rect.top < 0) {
          const articleId = parseInt((element as HTMLElement).dataset.articleId || '0');
          
          if (articleId && !markedAsReadRef.current.has(articleId)) {
            const article = articles.find(a => a.id === articleId);
            if (article && !article.is_read && !localReadStatus.has(articleId)) {
              console.log('Marking article as read via scroll:', articleId);
              markedAsReadRef.current.add(articleId);
              
              // Update local state to show as read immediately
              setLocalReadStatus(prev => new Set([...prev, articleId]));
              
              // Use scroll-based read handler if available
              if (onScrollBasedRead) {
                onScrollBasedRead(articleId);
              } else {
                onArticleRead(articleId);
              }
            }
          }
        }
      });
    };

    const handleScroll = () => {
      requestAnimationFrame(checkVisibleArticles);
    };

    // Add scroll listeners
    window.addEventListener('scroll', handleScroll);
    const scrollContainer = containerRef.current?.closest('.overflow-y-auto');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
    }

    // Initial check
    checkVisibleArticles();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [articles, onArticleRead, onScrollBasedRead, localReadStatus]);

  useEffect(() => {
    // Clear marked articles when articles list changes
    markedAsReadRef.current.clear();
    setLocalReadStatus(new Set());
  }, [articles]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const handleArticleClick = (article: Article) => {
    if (onArticleClick) {
      onArticleClick(article);
    } else {
      if (!article.is_read) {
        onArticleRead(article.id);
      }
      
      if (article.link) {
        window.open(article.link, '_blank', 'noopener,noreferrer');
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">記事がありません</h3>
          <p className="mt-1 text-sm text-gray-500">
            フィードを追加するか、既存のフィードを更新してください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="divide-y divide-gray-200">
      {articles.map((article) => {
        const isLocallyRead = localReadStatus.has(article.id);
        const isRead = article.is_read || isLocallyRead;
        
        return (
          <article
            key={article.id}
            data-article-id={article.id}
            className={`p-6 cursor-pointer transition-colors hover:bg-gray-50 ${
              isRead ? 'opacity-75' : ''
            }`}
            onClick={() => handleArticleClick(article)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  {!isRead && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                  )}
                  <h2 className={`text-lg font-semibold ${
                    isRead ? 'text-gray-600' : 'text-gray-900'
                  } line-clamp-2`}>
                    {article.title}
                  </h2>
                </div>
                
                {article.description && (
                  <p className={`text-sm ${
                    isRead ? 'text-gray-500' : 'text-gray-700'
                } line-clamp-3 mb-3`}>
                  {article.description}
                </p>
              )}
              
              <div className="flex items-center text-xs text-gray-500 space-x-4">
                {article.pub_date && (
                  <time dateTime={article.pub_date}>
                    {formatDate(article.pub_date)}
                  </time>
                )}
                <span className="flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {onArticleClick ? 'プレビュー' : '外部リンク'}
                </span>
              </div>
            </div>
            
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onArticleRead(article.id);
                }}
                className={`text-xs px-2 py-1 rounded-full ${
                  isRead
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {isRead ? '既読' : '未読'}
              </button>
            </div>
          </div>
        </article>
        );
      })}
    </div>
  );
}