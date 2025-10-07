'use client';

import React from 'react';
import { FaTwitter, FaHeart, FaRetweet, FaComment } from 'react-icons/fa';

export default function TwitterPosts({ posts, loading, error, searchQuery, setSearchQuery, selectedAccounts = [] }) {
  const tweets = posts || []; // Accept posts prop but use tweets internally for compatibility

  if (loading) {
    return (
      <div className="mt-4 md:mt-6 lg:mt-8 max-w-4xl mx-auto px-2 md:px-4">
        {/* Search bar - Mobile optimized */}
        <div className="mb-4 md:mb-6 flex justify-center">
          <input
            type="text"
            placeholder="Search tweets..."
            value={searchQuery || ''}
            onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
            className="border rounded-full px-3 md:px-4 py-2 md:py-3 w-full max-w-md text-sm md:text-base text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm bg-gray-50"
          />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 hover:bg-gray-50 transition-colors animate-pulse">
              <div className="flex space-x-3">
                {/* Profile Picture Skeleton */}
                <div className="w-12 h-12 bg-gray-300 rounded-full flex-shrink-0"></div>
                
                <div className="flex-1 min-w-0">
                  {/* Header Skeleton */}
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="h-4 bg-gray-300 rounded w-20"></div>
                    <div className="w-4 h-4 bg-gray-300 rounded"></div>
                    <div className="h-4 bg-gray-300 rounded w-16"></div>
                    <div className="h-4 bg-gray-300 rounded w-12"></div>
                  </div>
                  
                  {/* Content Skeleton */}
                  <div className="space-y-2 mb-4">
                    <div className="h-4 bg-gray-300 rounded w-full"></div>
                    <div className="h-4 bg-gray-300 rounded w-4/5"></div>
                    <div className="h-4 bg-gray-300 rounded w-3/5"></div>
                  </div>
                  
                  {/* Actions Skeleton */}
                  <div className="flex items-center justify-between max-w-md">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-gray-300 rounded"></div>
                      <div className="h-3 bg-gray-300 rounded w-6"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-gray-300 rounded"></div>
                      <div className="h-3 bg-gray-300 rounded w-6"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-gray-300 rounded"></div>
                      <div className="h-3 bg-gray-300 rounded w-6"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-gray-300 rounded"></div>
                    </div>
                  </div>
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
            placeholder="Search tweets..."
            value={searchQuery || ''}
            onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
            className="border rounded-full px-4 py-3 w-full max-w-md text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm bg-gray-50"
          />
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center justify-center">
            <FaTwitter className="text-red-500 mr-3 text-xl" />
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tweets || tweets.length === 0) {
    return (
      <div className="mt-8 max-w-2xl mx-auto">
        {/* Search bar */}
        <div className="mb-6 flex justify-center">
          <input
            type="text"
            placeholder="Search tweets..."
            value={searchQuery || ''}
            onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
            className="border rounded-full px-4 py-3 w-full max-w-md text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm bg-gray-50"
          />
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaTwitter className="text-blue-500 text-2xl" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No tweets found</h3>
          <p className="text-gray-600 max-w-sm mx-auto">
            Connect your Twitter account or try refreshing to see your tweets.
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
          placeholder="Search tweets..."
          value={searchQuery || ''}
          onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
          className="border rounded-full px-3 md:px-4 py-2 md:py-3 w-full max-w-md text-sm md:text-base text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm bg-gray-50"
        />
      </div>
      <div className="space-y-3 md:space-y-4">
        {tweets.map((tweet, index) => {
          // Use account-specific metadata if available (for multi-account posts)
          const tweetAccountName = tweet._accountName || tweet.author?.name || 'Twitter User';
          const tweetAccountAvatar = tweet._accountAvatar || tweet.author?.profile_image_url || '/default-avatar.png';
          const tweetAccountHandle = tweet.author?.username || 'username';
          
          return (
            <div key={tweet.id || index} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="flex space-x-3">
                {/* Profile Picture */}
                <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden">
                  {tweetAccountAvatar ? (
                    <img
                      src={tweetAccountAvatar}
                      alt={tweetAccountName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = '/default-avatar.png';
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {tweetAccountName ? tweetAccountName.charAt(0).toUpperCase() : '🐦'}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center space-x-2 mb-2">
                    <p className="font-bold text-gray-900">
                      {tweetAccountName}
                    </p>
                    {tweet.author?.verified && (
                      <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                    <p className="text-gray-500">
                      @{tweetAccountHandle}
                    </p>
                    <span className="text-gray-500">·</span>
                    <p className="text-gray-500">
                      {tweet.created_at ? new Date(tweet.created_at).toLocaleDateString() : 'Recently'}
                    </p>
                  </div>
                  
                  {/* Tweet Content */}
                  <div className="text-gray-900 mb-3 whitespace-pre-line leading-relaxed">
                    {tweet.text || tweet.full_text || 'Tweet content'}
                  </div>
                  
                  {/* Media (if any) */}
                  {tweet.attachments?.media && tweet.attachments.media.length > 0 && (
                    <div className="mb-4 rounded-2xl overflow-hidden border border-gray-200">
                      {tweet.attachments.media.slice(0, 4).map((media, i) => (
                        <div key={i} className="relative aspect-video bg-gray-100">
                          {media.type === 'photo' ? (
                            <img
                              src={media.url}
                              alt="Tweet media"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <video
                              src={media.url}
                              className="w-full h-full object-cover"
                              controls
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Engagement Actions */}
                  <div className="flex items-center justify-between max-w-md text-gray-500 text-sm">
                    <button className="flex items-center space-x-2 hover:text-blue-500 transition-colors group">
                      <div className="p-2 rounded-full group-hover:bg-blue-50 transition-colors">
                        <FaComment className="text-sm" />
                      </div>
                      {tweet.public_metrics?.reply_count > 0 && (
                        <span>{tweet.public_metrics.reply_count}</span>
                      )}
                    </button>
                    
                    <button className="flex items-center space-x-2 hover:text-green-500 transition-colors group">
                      <div className="p-2 rounded-full group-hover:bg-green-50 transition-colors">
                        <FaRetweet className="text-sm" />
                      </div>
                      {tweet.public_metrics?.retweet_count > 0 && (
                        <span>{tweet.public_metrics.retweet_count}</span>
                      )}
                    </button>
                    
                    <button className="flex items-center space-x-2 hover:text-red-500 transition-colors group">
                      <div className="p-2 rounded-full group-hover:bg-red-50 transition-colors">
                        <FaHeart className="text-sm" />
                      </div>
                      {tweet.public_metrics?.like_count > 0 && (
                        <span>{tweet.public_metrics.like_count}</span>
                      )}
                    </button>
                    
                    <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
