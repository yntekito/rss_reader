'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AddFeedForm from '@/components/AddFeedForm';
import { Feed } from '@/lib/db';

export default function SettingsPage() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeeds();
  }, []);

  const fetchFeeds = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/feeds');
      const data = await response.json();
      setFeeds(data);
    } catch (error) {
      console.error('Error fetching feeds:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedAdded = () => {
    fetchFeeds();
  };

  const handleDelete = async (feedId: number) => {
    if (!confirm('このフィードを削除しますか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/feeds/${feedId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let errorMessage = 'フィードの削除に失敗しました';
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // JSON parse failed, use default message
        }
        throw new Error(errorMessage);
      }

      fetchFeeds();
    } catch (error) {
      console.error('Error deleting feed:', error);
      alert(error instanceof Error ? error.message : 'フィードの削除に失敗しました');
    }
  };

  const handleRefresh = async (feedId: number) => {
    try {
      const response = await fetch(`/api/feeds/${feedId}`, {
        method: 'PUT',
      });

      if (!response.ok) {
        let errorMessage = 'フィードの更新に失敗しました';
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // JSON parse failed, use default message
        }
        throw new Error(errorMessage);
      }

      alert('フィードを更新しました');
    } catch (error) {
      console.error('Error refreshing feed:', error);
      alert(error instanceof Error ? error.message : 'フィードの更新に失敗しました');
    }
  };

  const refreshAllFeeds = async () => {
    try {
      const response = await fetch('/api/feeds', { method: 'PUT' });
      if (!response.ok) {
        let errorMessage = 'フィードの更新に失敗しました';
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // JSON parse failed, use default message
        }
        throw new Error(errorMessage);
      }
      alert('すべてのフィードを更新しました');
    } catch (error) {
      console.error('Error refreshing feeds:', error);
      alert(error instanceof Error ? error.message : 'フィードの更新に失敗しました');
    }
  };

  const handleCleanupOldContent = async () => {
    if (!confirm('1週間以上経過した記事のコンテンツと画像を削除します。この操作は元に戻せません。続行しますか？')) {
      return;
    }

    try {
      const response = await fetch('/api/cleanup', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('クリーンアップに失敗しました');
      }

      const result = await response.json();
      alert(result.message || 'クリーンアップが完了しました');
    } catch (error) {
      console.error('Error cleaning up old content:', error);
      alert('クリーンアップに失敗しました');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-800 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                記事一覧に戻る
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">フィード設定</h1>
            <div className="w-24"></div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Add Feed Section */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <AddFeedForm onFeedAdded={handleFeedAdded} />
          </div>

          {/* Debug Section */}
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">デバッグ</h2>
            <div className="flex space-x-4">
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/feeds');
                    const data = await response.json();
                    console.log('Feeds API response:', data);
                    alert(`Feeds GET Test: ${JSON.stringify(data)}`);
                  } catch (error) {
                    console.error('Feeds API error:', error);
                    alert(`Feeds GET Test Error: ${error}`);
                  }
                }}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm"
              >
                Test Feeds GET
              </button>
              <button
                onClick={async () => {
                  try {
                    console.log('Starting manual content download...');
                    const response = await fetch('/api/process-downloads', { 
                      method: 'POST' 
                    });
                    const data = await response.json();
                    if (response.ok) {
                      alert('コンテンツダウンロード処理が完了しました。コンソールログを確認してください。');
                    } else {
                      alert(`エラー: ${data.error}`);
                    }
                  } catch (error) {
                    console.error('Content download error:', error);
                    alert(`Content Download Error: ${error}`);
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
              >
                Force Content Download
              </button>
              <button
                onClick={async () => {
                  try {
                    if (!confirm('すべての記事のダウンロード状態をリセットします。続行しますか？')) {
                      return;
                    }
                    console.log('Resetting download flags...');
                    const response = await fetch('/api/reset-downloads', { 
                      method: 'POST' 
                    });
                    const data = await response.json();
                    if (response.ok) {
                      alert(`${data.resetCount}件の記事をリセットしました。`);
                    } else {
                      alert(`エラー: ${data.error}`);
                    }
                  } catch (error) {
                    console.error('Reset error:', error);
                    alert(`Reset Error: ${error}`);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
              >
                Reset Downloads
              </button>
            </div>
          </div>

          {/* Cleanup Section */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">ストレージ管理</h2>
            <div className="flex items-start space-x-4">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-2">
                  1週間以上経過した記事のコンテンツと画像を削除してストレージ容量を節約できます。
                </p>
                <p className="text-xs text-gray-500">
                  この操作により、記事のタイトルと概要は残りますが、ダウンロード済みの本文と画像は削除されます。
                </p>
              </div>
              <button
                onClick={handleCleanupOldContent}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
              >
                古いコンテンツを削除
              </button>
            </div>
          </div>

          {/* Feed List Section */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">登録済みフィード</h2>
                <button
                  onClick={refreshAllFeeds}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  すべて更新
                </button>
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">読み込み中...</span>
                </div>
              ) : feeds.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">フィードがありません</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    上のフォームからRSSフィードを追加してください。
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {feeds.map((feed) => (
                    <div
                      key={feed.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-lg font-medium text-gray-900 truncate">
                              {feed.title}
                            </h3>
                            {feed.unreadCount !== undefined && feed.unreadCount > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {feed.unreadCount}
                              </span>
                            )}
                          </div>
                          {feed.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {feed.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2 truncate">
                            {feed.url}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            作成日: {new Date(feed.created_at).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleRefresh(feed.id)}
                            className="p-2 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                            title="更新"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(feed.id)}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                            title="削除"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}