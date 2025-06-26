'use client';

import { useState, useEffect } from 'react';
import { Article } from '@/lib/db';

interface ArticlePreviewProps {
  article: Article | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (articleId: number) => void;
}

interface ArticleContent {
  title: string;
  content: string;
  excerpt: string;
  isRssOnly?: boolean;
  isFullContent?: boolean;
  fetchedAt?: string;
  error?: string;
}

export default function ArticlePreview({ article, isOpen, onClose, onMarkAsRead }: ArticlePreviewProps) {
  const [content, setContent] = useState<ArticleContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingFull, setFetchingFull] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (article && isOpen) {
      // Reset states
      setContent(null);
      setError(null);
      
      // Fetch RSS data immediately, then full content in background
      fetchArticleContent();
      
      if (!article.is_read) {
        onMarkAsRead(article.id);
      }
      
      // Prevent body scroll when preview is open
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll when preview is closed
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup function to restore scroll on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [article, isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const fetchArticleContent = async () => {
    if (!article) return;

    setLoading(true);
    setError(null);

    try {
      // First, get RSS data immediately
      const previewResponse = await fetch(`/api/articles/${article.id}/preview`);
      if (!previewResponse.ok) {
        throw new Error('記事の内容を取得できませんでした');
      }
      const previewData = await previewResponse.json();
      setContent(previewData);
      setLoading(false);

      // Then, fetch full content in background if article has link
      if (article.link && previewData.isRssOnly) {
        setFetchingFull(true);
        try {
          const fullResponse = await fetch(`/api/articles/${article.id}/content`);
          if (fullResponse.ok) {
            const fullData = await fullResponse.json();
            // If we got better content, update the display
            if (fullData.isFullContent && fullData.content.length > previewData.content.length) {
              setContent(fullData);
            }
          }
        } catch (fullError) {
          console.error('Error fetching full content:', fullError);
          // Don't show error for background fetch failure
        } finally {
          setFetchingFull(false);
        }
      }
    } catch (error) {
      console.error('Error fetching article content:', error);
      setError(error instanceof Error ? error.message : '記事の取得に失敗しました');
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const openOriginalArticle = () => {
    if (article?.link) {
      window.open(article.link, '_blank', 'noopener,noreferrer');
    }
  };

  if (!article) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Preview Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-2/3 lg:w-1/2 xl:w-2/5 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <div className="flex items-center space-x-3">
              <h2 className="text-lg font-semibold text-gray-900 truncate">記事プレビュー</h2>
              {fetchingFull && (
                <div className="flex items-center space-x-2 text-sm text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>完全版を取得中...</span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="p-6">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">エラーが発生しました</h3>
                  <p className="mt-1 text-sm text-gray-500">{error}</p>
                  <div className="mt-4">
                    <button
                      onClick={openOriginalArticle}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      元記事を開く
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6">
                {/* Article Header */}
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">
                    {content?.title || article.title}
                  </h1>
                  
                  <div className="flex items-center text-sm text-gray-500 space-x-4 mb-4">
                    {article.pub_date && (
                      <time dateTime={article.pub_date}>
                        {formatDate(article.pub_date)}
                      </time>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      article.is_read ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {article.is_read ? '既読' : '未読'}
                    </span>
                    {content?.isRssOnly && (
                      <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                        RSS版
                      </span>
                    )}
                    {content?.isFullContent && (
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        完全版
                      </span>
                    )}
                  </div>

                  {content?.excerpt && (
                    <p className="text-gray-600 text-lg leading-relaxed mb-4">
                      {content.excerpt}
                    </p>
                  )}
                </div>

                {/* Article Content */}
                {content?.content ? (
                  <div 
                    className="prose prose-lg max-w-none text-black
                    prose-headings:!text-black prose-headings:font-semibold
                    prose-p:!text-black prose-p:leading-relaxed prose-p:text-base
                    prose-a:!text-blue-600 prose-a:underline hover:prose-a:text-blue-800
                    prose-strong:!text-black prose-strong:font-semibold
                    prose-em:!text-black prose-em:italic
                    prose-ul:!text-black prose-ol:!text-black
                    prose-li:!text-black prose-li:leading-relaxed
                    prose-blockquote:!text-black prose-blockquote:border-gray-300
                    prose-code:!text-black prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded
                    prose-pre:bg-gray-900 prose-pre:!text-gray-100
                    [&_*]:!text-black [&_a]:!text-blue-600"
                    dangerouslySetInnerHTML={{ __html: content.content }}
                  />
                ) : article.description ? (
                  <div className="text-black leading-relaxed text-base">
                    {article.description}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <p>記事の内容を取得できませんでした。</p>
                    <p className="text-sm mt-2">元記事をご覧ください。</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 truncate flex-1 mr-4">
                {article.link}
              </div>
              <button
                onClick={openOriginalArticle}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                元記事を開く
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}