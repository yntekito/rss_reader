'use client';

import { Article } from '@/lib/db';

interface ArticleListProps {
  articles: Article[];
  loading: boolean;
  onArticleRead: (articleId: number) => void;
}

export default function ArticleList({ articles, loading, onArticleRead }: ArticleListProps) {
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
    if (!article.is_read) {
      onArticleRead(article.id);
    }
    
    if (article.link) {
      window.open(article.link, '_blank', 'noopener,noreferrer');
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
    <div className="divide-y divide-gray-200">
      {articles.map((article) => (
        <article
          key={article.id}
          className={`p-6 cursor-pointer transition-colors hover:bg-gray-50 ${
            article.is_read ? 'opacity-75' : ''
          }`}
          onClick={() => handleArticleClick(article)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                {!article.is_read && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                )}
                <h2 className={`text-lg font-semibold ${
                  article.is_read ? 'text-gray-600' : 'text-gray-900'
                } line-clamp-2`}>
                  {article.title}
                </h2>
              </div>
              
              {article.description && (
                <p className={`text-sm ${
                  article.is_read ? 'text-gray-500' : 'text-gray-700'
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  外部リンク
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
                  article.is_read
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {article.is_read ? '既読' : '未読'}
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}