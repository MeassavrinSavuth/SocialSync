'use client';

import React from 'react';
import { 
  FaTelegramPlane, 
  FaHeart, 
  FaComment, 
  FaShare, 
  FaEllipsisH,
  FaReply,
  FaForward,
  FaClock,
  FaUsers,
  FaLock
} from 'react-icons/fa';

export default function TelegramPosts({ posts, channelInfo, loading, error, searchQuery, setSearchQuery }) {
  // Use real channel data if available, otherwise fallback
  const channelName = channelInfo?.name || 'Telegram Channel';
  const channelAvatar = channelInfo?.avatar || '/default-avatar.png';
  const channelUsername = channelInfo?.username || '';

  const timeAgo = (dateString) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInMinutes = Math.floor((now - postDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d`;
    return postDate.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="mt-4 md:mt-6 lg:mt-8 max-w-4xl mx-auto px-2 md:px-4">
        {/* Search bar - Mobile optimized */}
        <div className="mb-4 md:mb-6 flex justify-center">
          <input
            type="text"
            placeholder="Search Telegram messages..."
            value={searchQuery || ''}
            onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
            className="border rounded-lg px-3 md:px-4 py-2 md:py-3 w-full max-w-md text-sm md:text-base text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm bg-gray-50"
          />
        </div>
        <div className="space-y-3 md:space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 animate-pulse">
              <div className="p-3 md:p-4">
                <div className="flex items-center space-x-2 md:space-x-3 mb-3 md:mb-4">
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
            placeholder="Search Telegram messages..."
            value={searchQuery || ''}
            onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
            className="border rounded-lg px-3 md:px-4 py-2 md:py-3 w-full max-w-md text-sm md:text-base text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm bg-gray-50"
          />
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 md:p-6 text-center">
          <div className="text-red-500 text-2xl md:text-4xl mx-auto mb-2 md:mb-3">📱</div>
          <h3 className="text-base md:text-lg font-medium text-red-800 mb-2">Unable to load Telegram messages</h3>
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
            placeholder="Search Telegram messages..."
            value={searchQuery || ''}
            onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
            className="border rounded-lg px-3 md:px-4 py-2 md:py-3 w-full max-w-md text-sm md:text-base text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm bg-gray-50"
          />
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 md:p-8 text-center">
          <div className="text-gray-400 text-4xl md:text-5xl mx-auto mb-3 md:mb-4">📱</div>
          <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">No Telegram messages found</h3>
          <p className="text-gray-500 text-xs md:text-sm">
            Connect your Telegram channel or try refreshing to see your messages.
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
          placeholder="Search Telegram messages..."
          value={searchQuery || ''}
          onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
          className="border rounded-lg px-3 md:px-4 py-2 md:py-3 w-full max-w-md text-sm md:text-base text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm bg-gray-50"
        />
      </div>
      
      <div className="space-y-3 md:space-y-4">
        {posts.map((post) => {
          const message = post.text || post.message || '';
          const media = post.photo || post.video || post.document;
          const views = post.views || 0;
          const forwards = post.forwards || 0;
          const replies = post.replies || 0;
          const date = post.date || post.created_at;
          
          return (
            <div key={post.id || post.message_id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-3 md:px-4 pt-3 md:pt-4 pb-2 md:pb-3">
                <div className="flex items-center space-x-2 md:space-x-3">
                  <div className="relative">
                    <img
                      src={channelAvatar}
                      alt={channelName}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-gray-100"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <FaTelegramPlane className="text-white text-xs" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-1">
                      <h3 className="font-semibold text-gray-900 hover:underline cursor-pointer text-sm md:text-base">
                        {channelName}
                      </h3>
                      {channelUsername && (
                        <span className="text-blue-500 text-xs md:text-sm">@{channelUsername}</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <span>{timeAgo(date)}</span>
                      <span>·</span>
                      <FaUsers className="text-xs" />
                      <span>Channel</span>
                    </div>
                  </div>
                </div>
                <button className="p-1.5 md:p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <FaEllipsisH className="text-gray-500 text-sm" />
                </button>
              </div>

              {/* Content */}
              {message && (
                <div className="px-3 md:px-4 pb-2 md:pb-3">
                  <p className="text-gray-900 text-sm md:text-base leading-relaxed whitespace-pre-line">
                    {message}
                  </p>
                </div>
              )}

              {/* Media */}
              {media && (
                <div className="mb-3">
                  {media.type === 'video' || media.file_name?.includes('.mp4') || media.file_name?.includes('.mov') ? (
                    <div className="relative">
                      <video 
                        src={media.url || media.file_url} 
                        className="w-full max-h-96 object-cover rounded-lg" 
                        controls
                        poster={media.thumb?.url}
                      >
                        Your browser does not support the video tag.
                      </video>
                      <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded flex items-center space-x-1">
                        <span>🎥</span>
                        <span>Video</span>
                      </div>
                    </div>
                  ) : media.type === 'document' ? (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-blue-600 text-lg">📄</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{media.file_name || 'Document'}</p>
                          <p className="text-xs text-gray-500">{media.file_size ? `${Math.round(media.file_size / 1024)} KB` : ''}</p>
                        </div>
                        <a 
                          href={media.url || media.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  ) : (
                    <img 
                      src={media.url || media.file_url} 
                      alt="Telegram media" 
                      className="w-full object-cover max-h-96 rounded-lg cursor-pointer hover:opacity-95 transition-opacity" 
                    />
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="px-3 md:px-4 pt-2 pb-2 md:pb-3 border-t border-gray-100">
                <div className="grid grid-cols-3 gap-1">
                  <button className="flex items-center justify-center space-x-2 py-2 px-2 md:px-4 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                    <FaReply className="text-sm" />
                    <span className="font-medium text-sm">
                      Reply{replies > 0 ? ` ${replies}` : ''}
                    </span>
                  </button>
                  <button className="flex items-center justify-center space-x-2 py-2 px-2 md:px-4 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                    <FaForward className="text-sm" />
                    <span className="font-medium text-sm">
                      Forward{forwards > 0 ? ` ${forwards}` : ''}
                    </span>
                  </button>
                  <button className="flex items-center justify-center space-x-2 py-2 px-2 md:px-4 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                    <FaHeart className="text-sm" />
                    <span className="font-medium text-sm">
                      Like
                    </span>
                  </button>
                </div>
              </div>

              {/* Views and engagement info */}
              {(views > 0 || forwards > 0) && (
                <div className="px-3 md:px-4 pb-2 md:pb-3 border-t border-gray-50 pt-2 md:pt-3">
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    {views > 0 && (
                      <div className="flex items-center space-x-1">
                        <FaClock className="text-xs" />
                        <span>{views} views</span>
                      </div>
                    )}
                    {forwards > 0 && (
                      <div className="flex items-center space-x-1">
                        <FaForward className="text-xs" />
                        <span>{forwards} forwards</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* View on Telegram Link */}
              {post.link && (
                <div className="px-3 md:px-4 pb-2 md:pb-3 border-t border-gray-50 pt-2 md:pt-3">
                  <a 
                    href={post.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-600 text-xs hover:underline flex items-center space-x-1"
                  >
                    <FaTelegramPlane className="text-xs" />
                    <span>View on Telegram</span>
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
