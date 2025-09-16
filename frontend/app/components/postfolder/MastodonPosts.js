'use client';

import React from 'react';
import { 
  FaRetweet, 
  FaHeart, 
  FaReply, 
  FaEllipsisH,
  FaGlobeAmericas,
  FaLock,
  FaUsers
} from 'react-icons/fa';

function timeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString();
}

export default function MastodonPosts({ posts, loading, error, searchQuery, setSearchQuery }) {
  if (loading) {
    return (
      <div className="mt-4 md:mt-6 lg:mt-8 max-w-4xl mx-auto px-2 md:px-4">
        {/* Search bar - Mobile optimized */}
        <div className="mb-4 md:mb-6 flex justify-center">
          <input
            type="text"
            placeholder="Search toots..."
            value={searchQuery || ''}
            onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
            className="border rounded-lg px-3 md:px-4 py-2 md:py-3 w-full max-w-md text-sm md:text-base text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none shadow-sm bg-gray-50"
          />
        </div>
        <div className="space-y-3 md:space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 animate-pulse">
              <div className="p-3 md:p-4">
                <div className="flex items-start space-x-2 md:space-x-3 mb-3 md:mb-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-300 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-3 md:h-4 bg-gray-300 rounded w-1/3 mb-1 md:mb-2"></div>
                    <div className="h-2 md:h-3 bg-gray-300 rounded w-1/4"></div>
                  </div>
                  <div className="h-2 md:h-3 bg-gray-300 rounded w-8 md:w-12"></div>
                </div>
                <div className="space-y-1 md:space-y-2 mb-3 md:mb-4">
                  <div className="h-3 md:h-4 bg-gray-300 rounded w-full"></div>
                  <div className="h-3 md:h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 md:h-4 bg-gray-300 rounded w-1/2"></div>
                </div>
                <div className="flex justify-between border-t pt-2 md:pt-3">
                  <div className="h-5 md:h-6 bg-gray-300 rounded w-12 md:w-16"></div>
                  <div className="h-5 md:h-6 bg-gray-300 rounded w-12 md:w-16"></div>
                  <div className="h-5 md:h-6 bg-gray-300 rounded w-12 md:w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 md:mt-6 lg:mt-8 max-w-4xl mx-auto px-2 md:px-4">
        {/* Search bar - Mobile optimized */}
        <div className="mb-4 md:mb-6 flex justify-center">
          <input
            type="text"
            placeholder="Search toots..."
            value={searchQuery || ''}
            onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
            className="border rounded-lg px-3 md:px-4 py-2 md:py-3 w-full max-w-md text-sm md:text-base text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none shadow-sm bg-gray-50"
          />
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 md:p-6 text-center">
          <div className="text-red-500 text-2xl md:text-4xl mx-auto mb-2 md:mb-3">🐘</div>
          <h3 className="text-base md:text-lg font-medium text-red-800 mb-2">Unable to load Mastodon posts</h3>
          <p className="text-red-600 text-xs md:text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="mt-4 md:mt-6 lg:mt-8 max-w-4xl mx-auto px-2 md:px-4">
        {/* Search bar - Mobile optimized */}
        <div className="mb-4 md:mb-6 flex justify-center">
          <input
            type="text"
            placeholder="Search toots..."
            value={searchQuery || ''}
            onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
            className="border rounded-lg px-4 py-3 w-full max-w-md text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none shadow-sm bg-gray-50"
          />
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 md:p-8 text-center">
          <div className="text-gray-400 text-4xl md:text-5xl mx-auto mb-3 md:mb-4">🐘</div>
          <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">No toots found</h3>
          <p className="text-gray-500 text-xs md:text-sm">
            Connect your Mastodon account or try refreshing to see your toots.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-4 md:mt-6 lg:mt-8 max-w-4xl mx-auto px-2 md:px-4">
      {/* Search bar - Mobile optimized */}
      <div className="mb-4 md:mb-6 flex justify-center">
        <input
          type="text"
          placeholder="Search toots..."
          value={searchQuery || ''}
          onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
          className="border rounded-lg px-3 md:px-4 py-2 md:py-3 w-full max-w-md text-sm md:text-base text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none shadow-sm bg-gray-50"
        />
      </div>
      
      <div className="space-y-3 md:space-y-4">
        {posts.map((post) => {
          const account = post.account || {};
          const favourites = post.favourites_count || 0;
          const reblogs = post.reblogs_count || 0;
          const replies = post.replies_count || 0;
          
          // Determine visibility icon
          const getVisibilityIcon = (visibility) => {
            switch (visibility) {
              case 'public': return <FaGlobeAmericas className="text-xs" />;
              case 'unlisted': return <FaLock className="text-xs" />;
              case 'private': return <FaUsers className="text-xs" />;
              default: return <FaGlobeAmericas className="text-xs" />;
            }
          };

          return (
            <div key={post.id} className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden">
              {/* Header - Mobile optimized */}
              <div className="flex items-start justify-between p-3 md:p-4 pb-2 md:pb-3">
                <div className="flex items-start space-x-2 md:space-x-3 flex-1">
                  <div className="relative">
                    <img
                      src={account.avatar || '/default-avatar.png'}
                      alt={account.display_name || account.username || 'User'}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-gray-100"
                    />
                    {account.bot && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        🤖
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1">
                      <h3 className="font-semibold text-gray-900 hover:underline cursor-pointer text-xs md:text-sm truncate max-w-[120px] md:max-w-none">
                        {account.display_name || account.username || 'User'}
                      </h3>
                      {account.locked && <FaLock className="text-gray-400 text-xs flex-shrink-0" />}
                    </div>
                    <div className="flex items-center space-x-1 md:space-x-2 text-xs text-gray-500">
                      <span className="truncate max-w-[100px] md:max-w-none">@{account.acct || account.username}</span>
                      <span className="hidden sm:inline">·</span>
                      <span className="whitespace-nowrap">{timeAgo(post.created_at)}</span>
                      <span className="hidden sm:inline">·</span>
                      <span className="hidden sm:inline">{getVisibilityIcon(post.visibility)}</span>
                    </div>
                  </div>
                </div>
                <button className="p-1.5 md:p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <FaEllipsisH className="text-gray-500 text-xs md:text-sm" />
                </button>
              </div>

              {/* Content - Mobile optimized */}
              <div className="px-3 md:px-4 pb-2 md:pb-3">
                <div 
                  className="text-gray-900 text-sm md:text-base leading-relaxed prose prose-sm md:prose-base max-w-none break-words"
                  dangerouslySetInnerHTML={{ __html: post.content || 'Toot content' }}
                />
              </div>

              {/* Media - Mobile optimized */}
              {post.media_attachments && post.media_attachments.length > 0 && (
                <div className="px-3 md:px-4 pb-2 md:pb-3">
                  <div className={`grid gap-1 md:gap-2 ${
                    post.media_attachments.length === 1 ? 'grid-cols-1' : 
                    post.media_attachments.length === 2 ? 'grid-cols-2' :
                    'grid-cols-2'
                  }`}>
                    {post.media_attachments.slice(0, 4).map((media, idx) => (
                      <div key={media.id || idx} className="relative overflow-hidden rounded-lg border border-gray-200">
                        {media.type === 'image' ? (
                          <img 
                            src={media.url || media.preview_url} 
                            alt={media.description || 'Media attachment'} 
                            className="w-full h-32 md:h-48 lg:h-64 object-cover hover:opacity-95 transition-opacity cursor-pointer" 
                          />
                        ) : media.type === 'video' ? (
                          <video 
                            src={media.url} 
                            className="w-full h-32 md:h-48 lg:h-64 object-cover" 
                            controls
                            poster={media.preview_url}
                          />
                        ) : (
                          <div className="w-full h-20 md:h-32 bg-gray-100 flex items-center justify-center text-gray-500 text-xs md:text-sm">
                            📎 {media.type} attachment
                          </div>
                        )}
                        {idx === 3 && post.media_attachments.length > 4 && (
                          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center text-white text-lg md:text-xl font-bold cursor-pointer hover:bg-opacity-50 transition-all">
                            +{post.media_attachments.length - 4}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons - Mobile optimized */}
              <div className="px-3 md:px-4 pt-2 pb-2 md:pb-3 border-t border-gray-100">
                <div className="flex items-center justify-between gap-1 md:gap-2">
                  <button className="flex items-center space-x-1 md:space-x-2 py-2 md:py-2 px-1.5 md:px-3 rounded-lg hover:bg-blue-50 transition-colors text-gray-600 hover:text-blue-600 min-h-[44px] flex-1 justify-center md:justify-start">
                    <FaReply className="text-xs md:text-sm" />
                    <span className="font-medium text-xs md:text-sm hidden sm:inline">
                      Reply
                    </span>
                    {replies > 0 && (
                      <span className="font-medium text-xs md:text-sm">
                        {replies}
                      </span>
                    )}
                  </button>
                  <button className="flex items-center space-x-1 md:space-x-2 py-2 md:py-2 px-1.5 md:px-3 rounded-lg hover:bg-green-50 transition-colors text-gray-600 hover:text-green-600 min-h-[44px] flex-1 justify-center md:justify-start">
                    <FaRetweet className="text-xs md:text-sm" />
                    <span className="font-medium text-xs md:text-sm hidden sm:inline">
                      Boost
                    </span>
                    {reblogs > 0 && (
                      <span className="font-medium text-xs md:text-sm">
                        {reblogs}
                      </span>
                    )}
                  </button>
                  <button className="flex items-center space-x-1 md:space-x-2 py-2 md:py-2 px-1.5 md:px-3 rounded-lg hover:bg-red-50 transition-colors text-gray-600 hover:text-red-600 min-h-[44px] flex-1 justify-center md:justify-start">
                    <FaHeart className="text-xs md:text-sm" />
                    <span className="font-medium text-xs md:text-sm hidden sm:inline">
                      Favourite
                    </span>
                    {favourites > 0 && (
                      <span className="font-medium text-xs md:text-sm">
                        {favourites}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* View on Mastodon Link - Mobile optimized */}
              {post.url && (
                <div className="px-3 md:px-4 pb-2 md:pb-3 border-t border-gray-50 pt-2 md:pt-3">
                  <a 
                    href={post.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-purple-600 text-xs md:text-sm hover:underline flex items-center space-x-1 min-h-[44px] py-2"
                  >
                    <span>🐘</span>
                    <span>View on Mastodon</span>
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}