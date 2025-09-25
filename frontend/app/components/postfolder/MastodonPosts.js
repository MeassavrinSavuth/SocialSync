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
      <div className="mt-8 max-w-2xl mx-auto">
        {/* Search bar */}
        <div className="mb-6 flex justify-center">
          <input
            type="text"
            placeholder="Search toots..."
            value={searchQuery || ''}
            onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
            className="border rounded-lg px-4 py-3 w-full max-w-md text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none shadow-sm bg-gray-50"
          />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 animate-pulse">
              <div className="p-4">
                <div className="flex items-start space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/4"></div>
                  </div>
                  <div className="h-3 bg-gray-300 rounded w-12"></div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-gray-300 rounded w-full"></div>
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <div className="h-6 bg-gray-300 rounded w-16"></div>
                  <div className="h-6 bg-gray-300 rounded w-16"></div>
                  <div className="h-6 bg-gray-300 rounded w-16"></div>
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
      <div className="mt-8 max-w-2xl mx-auto">
        {/* Search bar */}
        <div className="mb-6 flex justify-center">
          <input
            type="text"
            placeholder="Search toots..."
            value={searchQuery || ''}
            onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
            className="border rounded-lg px-4 py-3 w-full max-w-md text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none shadow-sm bg-gray-50"
          />
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-500 text-4xl mx-auto mb-3">🐘</div>
          <h3 className="text-lg font-medium text-red-800 mb-2">Unable to load Mastodon posts</h3>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }
 
  if (!posts || posts.length === 0) {
    return (
      <div className="mt-8 max-w-2xl mx-auto">
        {/* Search bar */}
        <div className="mb-6 flex justify-center">
          <input
            type="text"
            placeholder="Search toots..."
            value={searchQuery || ''}
            onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
            className="border rounded-lg px-4 py-3 w-full max-w-md text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none shadow-sm bg-gray-50"
          />
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-gray-400 text-5xl mx-auto mb-4">🐘</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No toots found</h3>
          <p className="text-gray-500 text-sm">
            Connect your Mastodon account or try refreshing to see your toots.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-8 max-w-2xl mx-auto">
      {/* Search bar */}
      <div className="mb-6 flex justify-center">
        <input
          type="text"
          placeholder="Search toots..."
          value={searchQuery || ''}
          onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
          className="border rounded-lg px-4 py-3 w-full max-w-md text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none shadow-sm bg-gray-50"
        />
      </div>
      
      <div className="space-y-4">
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
            <div key={post.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
              {/* Header */}
              <div className="flex items-start justify-between p-4 pb-3">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="relative">
                    <img
                      src={account.avatar || '/default-avatar.png'}
                      alt={account.display_name || account.username || 'User'}
                      className="w-12 h-12 rounded-full border-2 border-gray-100"
                    />
                    {account.bot && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        🤖
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1">
                      <h3 className="font-semibold text-gray-900 hover:underline cursor-pointer text-sm">
                        {account.display_name || account.username || 'User'}
                      </h3>
                      {account.locked && <FaLock className="text-gray-400 text-xs" />}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>@{account.acct || account.username}</span>
                      <span>·</span>
                      <span>{timeAgo(post.created_at)}</span>
                      <span>·</span>
                      {getVisibilityIcon(post.visibility)}
                    </div>
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <FaEllipsisH className="text-gray-500 text-sm" />
                </button>
              </div>
 
              {/* Content */}
              <div className="px-4 pb-3">
                <div
                  className="text-gray-900 text-sm leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: post.content || 'Toot content' }}
                />
              </div>
 
              {/* Media */}
              {post.media_attachments && post.media_attachments.length > 0 && (
                <div className="px-4 pb-3">
                  <div className={`grid gap-3 ${post.media_attachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {post.media_attachments.slice(0, 4).map((media, idx) => (
                      <div key={media.id || idx} className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                        {media.type === 'image' ? (
                          <div className="relative">
                            <img
                              src={media.url || media.preview_url}
                              alt={media.description || 'Media attachment'}
                              className="w-full h-80 object-contain bg-gray-100 hover:opacity-95 transition-opacity cursor-pointer"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-500 hidden">
                              <span>📷 Image</span>
                            </div>
                          </div>
                        ) : media.type === 'video' ? (
                          <div className="relative">
                            <video
                              src={media.url}
                              className="w-full h-80 object-cover"
                              controls
                              poster={media.preview_url}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-500 hidden">
                              <span>🎥 Video</span>
                            </div>
                            {/* Video indicator overlay */}
                            <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium">
                              🎥 Video
                            </div>
                          </div>
                        ) : media.type === 'gifv' ? (
                          <div className="relative">
                            <video
                              src={media.url}
                              className="w-full h-80 object-cover"
                              autoPlay
                              loop
                              muted
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-500 hidden">
                              <span>🎬 GIF</span>
                            </div>
                            {/* GIF indicator overlay */}
                            <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium">
                              🎬 GIF
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-80 bg-gray-100 flex items-center justify-center text-gray-500">
                            <span>📎 {media.type} attachment</span>
                          </div>
                        )}
                        {idx === 3 && post.media_attachments.length > 4 && (
                          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center text-white text-xl font-bold cursor-pointer hover:bg-opacity-50 transition-all">
                            +{post.media_attachments.length - 4}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
 
              {/* Action Buttons */}
              <div className="px-4 pt-2 pb-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <button className="flex items-center space-x-2 py-2 px-3 rounded-lg hover:bg-blue-50 transition-colors text-gray-600 hover:text-blue-600">
                    <FaReply className="text-sm" />
                    <span className="font-medium text-sm">
                      Reply{replies > 0 ? ` ${replies}` : ''}
                    </span>
                  </button>
                  <button className="flex items-center space-x-2 py-2 px-3 rounded-lg hover:bg-green-50 transition-colors text-gray-600 hover:text-green-600">
                    <FaRetweet className="text-sm" />
                    <span className="font-medium text-sm">
                      Boost{reblogs > 0 ? ` ${reblogs}` : ''}
                    </span>
                  </button>
                  <button className="flex items-center space-x-2 py-2 px-3 rounded-lg hover:bg-red-50 transition-colors text-gray-600 hover:text-red-600">
                    <FaHeart className="text-sm" />
                    <span className="font-medium text-sm">
                      Favourite{favourites > 0 ? ` ${favourites}` : ''}
                    </span>
                  </button>
                </div>
              </div>
 
              {/* View on Mastodon Link */}
              {post.url && (
                <div className="px-4 pb-3 border-t border-gray-50 pt-3">
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 text-xs hover:underline flex items-center space-x-1"
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
 