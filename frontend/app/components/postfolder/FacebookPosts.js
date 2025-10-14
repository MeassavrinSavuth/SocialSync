'use client';
 
import React, { useState } from 'react';
import {
  FaFacebook,
  FaThumbsUp,
  FaComment,
  FaShare,
  FaGlobeAmericas,
  FaEllipsisH,
  FaHeart,
  FaLaugh
} from 'react-icons/fa';
 
export default function FacebookPosts({ posts, pageInfo, loading, error, searchQuery, setSearchQuery }) {
  const [imageAspects, setImageAspects] = useState({});
  
  // Use real page data if available, otherwise fallback
  const pageName = pageInfo?.name || 'Facebook Page';
  const pageAvatar = pageInfo?.avatar || '/default-avatar.png';

  // Helper function to get aspect ratio class based on image dimensions
  const getAspectClass = (postId, imageUrl) => {
    if (imageAspects[postId]) {
      return imageAspects[postId];
    }
    
    // Default to square for unknown dimensions
    return 'aspect-square md:aspect-[4/5]';
  };

  // Load image to detect aspect ratio
  const detectImageAspect = (postId, imageUrl) => {
    if (imageAspects[postId] || !imageUrl) return;
    
    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      let aspectClass;
      
      if (ratio > 1.2) {
        aspectClass = 'aspect-video'; // landscape
      } else if (ratio < 0.9) {
        aspectClass = 'aspect-[4/5]'; // portrait
      } else {
        aspectClass = 'aspect-square'; // square
      }
      
      setImageAspects(prev => ({
        ...prev,
        [postId]: aspectClass
      }));
    };
    img.src = imageUrl;
  };
 
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
      <div className="mt-8 max-w-2xl mx-auto">
        {/* Search bar */}
        <div className="mb-6 flex justify-center">
          <input
            type="text"
            placeholder="Search Facebook posts..."
            value={searchQuery || ''}
            onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
            className="border rounded-lg px-4 py-3 w-full max-w-md text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm bg-gray-50"
          />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 animate-pulse">
              <div className="p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/4"></div>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-gray-300 rounded w-full"></div>
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                </div>
                <div className="h-64 bg-gray-300 rounded-lg mb-4"></div>
                <div className="flex justify-around border-t pt-3">
                  <div className="h-8 bg-gray-300 rounded w-16"></div>
                  <div className="h-8 bg-gray-300 rounded w-16"></div>
                  <div className="h-8 bg-gray-300 rounded w-16"></div>
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
            placeholder="Search Facebook posts..."
            value={searchQuery || ''}
            onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
            className="border rounded-lg px-4 py-3 w-full max-w-md text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm bg-gray-50"
          />
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <FaFacebook className="text-red-500 text-4xl mx-auto mb-3" />
          <h3 className="text-lg font-medium text-red-800 mb-2">Unable to load Facebook posts</h3>
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
            placeholder="Search Facebook posts..."
            value={searchQuery || ''}
            onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
            className="border rounded-lg px-4 py-3 w-full max-w-md text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm bg-gray-50"
          />
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <FaFacebook className="text-gray-400 text-5xl mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Facebook posts found</h3>
          <p className="text-gray-500 text-sm">
            Connect your Facebook account or try refreshing to see your posts.
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
          placeholder="Search Facebook posts..."
          value={searchQuery || ''}
          onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
          className="border rounded-lg px-4 py-3 w-full max-w-md text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm bg-gray-50"
        />
      </div>
      
      <div className="space-y-4">
        {posts.map((post) => {
          const message = post.message || '';
          const image = post.full_picture;
          // Ensure we only show real engagement data - set to 0 if undefined or null
          const likes = (post.likes?.summary?.total_count && post.likes.summary.total_count > 0) ? post.likes.summary.total_count : 0;
          const comments = (post.comments?.summary?.total_count && post.comments.summary.total_count > 0) ? post.comments.summary.total_count : 0;
          const shares = (post.shares?.count && post.shares.count > 0) ? post.shares.count : 0;
          const attachments = post.attachments?.data || [];
          
          // Use account-specific metadata if available (for multi-account posts)
          const postPageName = post._accountName || pageName;
          const postPageAvatar = post._accountAvatar || pageAvatar;
          
          return (
            <div key={post.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img
                      src={postPageAvatar}
                      alt={postPageName}
                      className="w-10 h-10 rounded-full border-2 border-gray-100"
                      onError={(e) => {
                        console.log('Facebook profile picture failed to load:', postPageAvatar);
                        e.target.src = '/default-avatar.png';
                      }}
                      crossOrigin="anonymous"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                      <FaFacebook className="text-white text-xs" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-1">
                      <h3 className="font-semibold text-gray-900 hover:underline cursor-pointer">
                        {postPageName}
                      </h3>
                      <span className="text-blue-500 text-sm">✓</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <span>{timeAgo(post.created_time)}</span>
                      <span>·</span>
                      <FaGlobeAmericas className="text-xs" />
                    </div>
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <FaEllipsisH className="text-gray-500 text-sm" />
                </button>
              </div>
 
              {/* Content */}
              {message && (
                <div className="px-4 pb-3">
                  <p className="text-gray-900 text-sm leading-relaxed whitespace-pre-line">
                    {message}
                  </p>
                </div>
              )}
 
              {/* Media */}
              {attachments.length > 0 ? (
                <div className="mb-3">
                  <div className={`grid ${attachments.length === 1 ? 'grid-cols-1' : attachments.length === 2 ? 'grid-cols-2' : 'grid-cols-2'} gap-3`}>
                    {attachments.slice(0, 4).map((attachment, idx) => (
                      <div key={idx} className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                        <img
                          src={attachment.media?.image?.src || attachment.target?.url}
                          alt="Facebook attachment"
                          className="w-full h-80 object-contain bg-gray-100 hover:opacity-95 transition-opacity cursor-pointer"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-500 hidden">
                          <span>📷 Image</span>
                        </div>
                        {idx === 3 && attachments.length > 4 && (
                          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center text-white text-xl font-bold cursor-pointer hover:bg-opacity-50 transition-all">
                            +{attachments.length - 4}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : image && (
                <div className={`w-full rounded-xl overflow-hidden bg-white ${getAspectClass(post.id, image)}`}>
                  <img
                    src={image}
                    alt="Facebook post"
                    className="w-full h-full object-cover"
                    onLoad={() => detectImageAspect(post.id, image)}
                    onError={(e) => {
                      console.log('Facebook image failed to load:', image);
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                    crossOrigin="anonymous"
                  />
                  <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-500 hidden">
                    <span>📷 Image</span>
                  </div>
                </div>
              )}
 
              {/* Action Buttons */}
              <div className="px-4 pt-2 pb-3 border-t border-gray-100">
                <div className="grid grid-cols-3 gap-1">
                  <button className="flex items-center justify-center space-x-2 py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                    <FaThumbsUp className="text-sm" />
                    <span className="font-medium text-sm">
                      Like{likes > 0 ? ` ${likes}` : ''}
                    </span>
                  </button>
                  <button className="flex items-center justify-center space-x-2 py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                    <FaComment className="text-sm" />
                    <span className="font-medium text-sm">
                      Comment{comments > 0 ? ` ${comments}` : ''}
                    </span>
                  </button>
                  <button className="flex items-center justify-center space-x-2 py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
                    <FaShare className="text-sm" />
                    <span className="font-medium text-sm">
                      Share{shares > 0 ? ` ${shares}` : ''}
                    </span>
                  </button>
                </div>
              </div>
 
              {/* View on Facebook Link */}
              {post.permalink_url && (
                <div className="px-4 pb-3 border-t border-gray-50 pt-3">
                  <a
                    href={post.permalink_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 text-xs hover:underline flex items-center space-x-1"
                  >
                    <FaFacebook className="text-xs" />
                    <span>View on Facebook</span>
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
 