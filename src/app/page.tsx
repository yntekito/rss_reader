'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import FeedList from '@/components/FeedList';
import ArticleList from '@/components/ArticleList';
import ArticlePreview from '@/components/ArticlePreview';
import { Feed, Article } from '@/lib/db';

export default function Home() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedFeedId, setSelectedFeedId] = useState<number | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [previewArticle, setPreviewArticle] = useState<Article | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    fetchFeeds();
    fetchArticles();
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [selectedFeedId, showUnreadOnly]);

  const fetchFeeds = async () => {
    try {
      const response = await fetch('/api/feeds');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setFeeds(data);
      } else {
        console.error('Feeds data is not an array:', data);
        setFeeds([]);
      }
    } catch (error) {
      console.error('Error fetching feeds:', error);
      setFeeds([]);
    }
  };

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedFeedId) params.append('feedId', selectedFeedId.toString());
      if (showUnreadOnly) params.append('unreadOnly', 'true');
      
      const response = await fetch(`/api/articles?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setArticles(data);
      } else {
        console.error('Articles data is not an array:', data);
        setArticles([]);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [selectedFeedId, showUnreadOnly]);

  const refreshFeeds = async () => {
    try {
      await fetch('/api/feeds', { method: 'PUT' });
      await fetchFeeds();
      await fetchArticles();
    } catch (error) {
      console.error('Error refreshing feeds:', error);
    }
  };

  const handleFeedDeleted = () => {
    fetchFeeds();
    fetchArticles();
    setSelectedFeedId(null);
  };

  const handleArticleRead = async (articleId: number, skipRefresh: boolean = false) => {
    try {
      await fetch(`/api/articles/${articleId}/read`, { method: 'PUT' });
      if (!skipRefresh) {
        await fetchArticles();
      }
    } catch (error) {
      console.error('Error marking article as read:', error);
    }
  };

  const handleScrollBasedRead = async (articleId: number) => {
    // Mark as read without refreshing the article list
    await handleArticleRead(articleId, true);
  };

  const handleArticleClick = (article: Article) => {
    setPreviewArticle(article);
    setIsPreviewOpen(true);
  };

  const handlePreviewClose = () => {
    setIsPreviewOpen(false);
    setPreviewArticle(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900">RSS Reader</h1>
            <div className="flex items-center space-x-4">
              <Link
                href="/settings"
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                設定
              </Link>
              <button
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  showUnreadOnly
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
{showUnreadOnly ? '未読のみ' : '既読も表示'}
              </button>
              <button
                onClick={refreshFeeds}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                更新
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <FeedList
                feeds={feeds}
                selectedFeedId={selectedFeedId}
                onFeedSelect={setSelectedFeedId}
                onFeedDeleted={handleFeedDeleted}
              />
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border">
              <ArticleList
                articles={articles}
                loading={loading}
                onArticleRead={handleArticleRead}
                onScrollBasedRead={handleScrollBasedRead}
                onArticleClick={handleArticleClick}
              />
            </div>
          </div>
        </div>
      </div>

      <ArticlePreview
        article={previewArticle}
        isOpen={isPreviewOpen}
        onClose={handlePreviewClose}
        onMarkAsRead={handleArticleRead}
      />
    </div>
  );
}
