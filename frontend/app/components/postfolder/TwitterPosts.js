import React from 'react';
import { FaSearch, FaTwitter, FaHeart, FaRetweet, FaComment } from 'react-icons/fa';

export default function TwitterPosts({ posts, includes, tweetAuthor, loading, error, searchQuery, setSearchQuery }) {
  const getTweetMedia = (tweet, includes) => {
    if (!tweet.attachments || !tweet.attachments.media_keys || !includes || !includes.media) return [];
    return tweet.attachments.media_keys.map(key =>
      includes.media.find(m => m.media_key === key)
    ).filter(Boolean);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
        <span className="ml-3 text-gray-600">Loading Twitter posts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-lg font-medium">{error}</div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* Search bar */}
      <div className="relative mb-6">
        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search Twitter posts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        />
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-8">
          <FaTwitter className="mx-auto text-6xl text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">No Twitter posts found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((tweet, index) => {
            const media = getTweetMedia(tweet, includes);
            return (
              <div key={tweet.id || index} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                {/* Tweet Author */}
                {tweetAuthor && (
                  <div className="flex items-center mb-3">
                    {tweetAuthor.profile_image_url && (
                      <img
                        src={tweetAuthor.profile_image_url}
                        alt={tweetAuthor.name}
                        className="w-10 h-10 rounded-full mr-3"
                      />
                    )}
                    <div>
                      <div className="font-semibold text-gray-900">{tweetAuthor.name}</div>
                      <div className="text-gray-500 text-sm">@{tweetAuthor.username}</div>
                    </div>
                    <FaTwitter className="ml-auto text-sky-500" />
                  </div>
                )}

                {/* Tweet Text */}
                <div className="text-gray-800 mb-4 whitespace-pre-wrap">
                  {tweet.text}
                </div>

                {/* Tweet Media */}
                {media.length > 0 && (
                  <div className="mb-4">
                    {media.map((mediaItem, mediaIndex) => (
                      <div key={mediaIndex} className="mb-2">
                        {mediaItem.type === 'photo' && (
                          <img
                            src={mediaItem.url}
                            alt="Tweet media"
                            className="max-w-full h-auto rounded-lg"
                          />
                        )}
                        {mediaItem.type === 'video' && (
                          <video
                            controls
                            className="max-w-full h-auto rounded-lg"
                            poster={mediaItem.preview_image_url}
                          >
                            <source src={mediaItem.url} type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Tweet Stats */}
                <div className="flex items-center text-gray-500 text-sm space-x-6">
                  {tweet.public_metrics && (
                    <>
                      <div className="flex items-center space-x-1">
                        <FaComment />
                        <span>{tweet.public_metrics.reply_count || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FaRetweet />
                        <span>{tweet.public_metrics.retweet_count || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FaHeart />
                        <span>{tweet.public_metrics.like_count || 0}</span>
                      </div>
                    </>
                  )}
                  {tweet.created_at && (
                    <div className="ml-auto">
                      {new Date(tweet.created_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
