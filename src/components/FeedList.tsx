'use client';

import { Feed } from '@/lib/db';

interface FeedListProps {
  feeds: Feed[];
  selectedFeedId: number | null;
  onFeedSelect: (feedId: number | null) => void;
  onFeedDeleted: () => void;
}

export default function FeedList({ feeds, selectedFeedId, onFeedSelect, onFeedDeleted }: FeedListProps) {
  const handleDelete = async (feedId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('このフィードを削除しますか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/feeds/${feedId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('フィードの削除に失敗しました');
      }

      onFeedDeleted();
    } catch (error) {
      console.error('Error deleting feed:', error);
      alert('フィードの削除に失敗しました');
    }
  };

  const handleRefresh = async (feedId: number, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const response = await fetch(`/api/feeds/${feedId}`, {
        method: 'PUT',
      });

      if (!response.ok) {
        throw new Error('フィードの更新に失敗しました');
      }

      onFeedDeleted(); // Refresh the data
    } catch (error) {
      console.error('Error refreshing feed:', error);
      alert('フィードの更新に失敗しました');
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">フィード一覧</h2>
      <div className="space-y-2">
        <button
          onClick={() => onFeedSelect(null)}
          className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
            selectedFeedId === null
              ? 'bg-blue-100 text-blue-800'
              : 'hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>すべてのフィード</span>
            {(() => {
              const totalUnread = feeds.reduce((sum, feed) => sum + (feed.unreadCount || 0), 0);
              return totalUnread > 0 ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-2 flex-shrink-0">
                  {totalUnread}
                </span>
              ) : null;
            })()}
          </div>
        </button>
        
        {feeds.length === 0 ? (
          <div className="text-gray-500 text-sm py-4">
            フィードがありません
          </div>
        ) : (
          feeds.map((feed) => (
            <div
              key={feed.id}
              className={`group relative rounded-md transition-colors ${
                selectedFeedId === feed.id
                  ? 'bg-blue-100 text-blue-800'
                  : 'hover:bg-gray-100'
              }`}
            >
              <button
                onClick={() => onFeedSelect(feed.id)}
                className="w-full text-left px-3 py-2 pr-16"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium truncate flex-1">{feed.title}</div>
                  {feed.unreadCount !== undefined && feed.unreadCount > 0 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-2 flex-shrink-0">
                      {feed.unreadCount}
                    </span>
                  )}
                </div>
                {feed.description && (
                  <div className="text-sm text-gray-500 truncate mt-1">
                    {feed.description}
                  </div>
                )}
              </button>
              
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleRefresh(feed.id, e)}
                  className="p-1 text-gray-400 hover:text-blue-600 mr-1"
                  title="更新"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button
                  onClick={(e) => handleDelete(feed.id, e)}
                  className="p-1 text-gray-400 hover:text-red-600"
                  title="削除"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}