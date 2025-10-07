'use client';

import React, { useState } from 'react';
import { FaInstagram, FaHeart, FaComment, FaGlobeAmericas, FaEllipsisH, FaPlay, FaImages } from 'react-icons/fa';

export default function InstagramPosts({ posts, loading, error, searchQuery, setSearchQuery, selectedAccounts = [] }) {
  const [expandedCaptions, setExpandedCaptions] = useState({});
  const [imageAspects, setImageAspects] = useState({});

  // Helper function to get aspect ratio class based on image dimensions
  const getAspectClass = (postId, mediaUrl) => {
    if (imageAspects[postId]) {
      return imageAspects[postId];
    }
    
    // Default to square for unknown dimensions, but use video aspect for video content
    if (mediaUrl && (mediaUrl.includes('video') || mediaUrl.includes('.mp4'))) {
      return 'aspect-video';
    }
    
    return 'aspect-square md:aspect-[4/5]';
  };

  // Load image to detect aspect ratio
  const detectImageAspect = (postId, mediaUrl) => {
    if (imageAspects[postId] || !mediaUrl) return;
    
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
    img.src = mediaUrl;
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

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleCaptionExpansion = (postId) => {
    setExpandedCaptions(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const truncateText = (text, maxLength = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto py-4 md:py-6 lg:py-8 px-4 md:px-6 lg:px-8">
        {/* Search and controls */}
        <div className="mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-full max-w-md">
              <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
          <div className="text-center">
            <div className="h-4 bg-gray-200 rounded w-48 mx-auto animate-pulse"></div>
          </div>
        </div>

        {/* Skeleton grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-6 animate-pulse">
              {/* Header skeleton */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="space-y-1">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="w-6 h-6 bg-gray-200 rounded"></div>
              </div>
              
              {/* Media skeleton */}
              <div className="aspect-square bg-gray-200 rounded-lg mb-4"></div>
              
              {/* Content skeleton */}
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto py-4 md:py-6 lg:py-8 px-4 md:px-6 lg:px-8">
        {/* Search and controls */}
        <div className="mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-full max-w-md">
              <input
                type="text"
                placeholder="Search Instagram posts..."
                value={searchQuery || ''}
                onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Error card */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-md mx-auto">
          <FaInstagram className="text-red-500 text-4xl mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to load Instagram posts</h3>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!posts || posts.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto py-4 md:py-6 lg:py-8 px-4 md:px-6 lg:px-8">
        {/* Search and controls */}
        <div className="mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-full max-w-md">
              <input
                type="text"
                placeholder="Search Instagram posts..."
                value={searchQuery || ''}
                onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Empty state */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FaInstagram className="text-white text-2xl" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Instagram posts found</h3>
          <p className="text-gray-500 text-sm mb-6">
            {searchQuery ? 'No posts match your search. Try adjusting your filters.' : 'Connect your Instagram account or try refreshing to see your posts.'}
          </p>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery && setSearchQuery('')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto py-4 md:py-6 lg:py-8 px-4 md:px-6 lg:px-8">
      {/* Search and controls */}
      <div className="mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-full max-w-md">
        <input
          type="text"
              placeholder="Search Instagram posts..."
              value={searchQuery || ''}
              onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
            />
          </div>
        </div>
        
        {/* Status caption */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Viewing: Instagram · {selectedAccounts.length} account{selectedAccounts.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      </div>

      {/* Posts grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {posts.map((post) => {
          const caption = post.caption || '';
          const mediaType = post.media_type;
          const mediaUrl = post.media_url || post.thumbnail_url;
          const likes = post.like_count || 0;
          const comments = post.comments_count || 0;
          const isCarousel = mediaType === 'CAROUSEL_ALBUM';
          const isVideo = mediaType === 'VIDEO';
          
          // Debug: Log post data to understand structure
          console.log('Instagram post data:', {
            id: post.id,
            media_type: post.media_type,
            media_url: post.media_url,
            video_url: post.video_url,
            image_url: post.image_url,
            thumbnail_url: post.thumbnail_url,
            timestamp: post.timestamp,
            caption: post.caption,
            allKeys: Object.keys(post)
          });
          
          // Handle mixed media - check if post has both video and image URLs
          // For Instagram, mixed media might be in different fields or as separate posts
          const hasVideo = post.video_url || (isVideo && mediaUrl);
          const hasImage = post.image_url || post.media_url || (!isVideo && mediaUrl);
          const isMixedMedia = hasVideo && hasImage && post.video_url !== post.image_url;
          
          // Better video detection
          const isVideoContent = isVideo || (mediaUrl && (
            mediaUrl.includes('.mp4') || 
            mediaUrl.includes('video') || 
            mediaUrl.includes('stream')
          ));
          
          // Use account-specific metadata if available
          const postAccountName = post._accountName || 'Instagram Account';
          const postAccountAvatar = post._accountAvatar || '/default-avatar.png';
          
          const isCaptionExpanded = expandedCaptions[post.id];
          const shouldTruncateCaption = caption.length > 150 && !isCaptionExpanded;
          const displayCaption = shouldTruncateCaption ? truncateText(caption) : caption;

          return (
            <div 
              key={post.id} 
              className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 hover:shadow-md transition-all duration-200 hover:ring-black/10"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 pb-4">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="relative flex-shrink-0">
                    <img
                      src={postAccountAvatar}
                      alt={`${postAccountName} profile picture`}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                      <FaInstagram className="text-white text-xs" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {postAccountName}
                      </h3>
                      <span className="text-pink-500 text-sm">✓</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <span>{timeAgo(post.timestamp)}</span>
                      <span>·</span>
                      <FaGlobeAmericas className="text-xs" />
                    </div>
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
                  <FaEllipsisH className="text-gray-500 text-sm" />
                </button>
              </div>

              {/* Media */}
              {isMixedMedia ? (
                // Mixed media - show both video and image
                <div className="space-y-2">
                  {/* Video */}
                  <div className={`w-full rounded-xl overflow-hidden bg-white relative ${getAspectClass(post.id + '_video', hasVideo)}`}>
                    <video 
                      className="w-full h-full object-cover"
                      poster={post.thumbnail_url}
                      controls
                      preload="metadata"
                      playsInline
                    >
                      <source src={hasVideo} type="video/mp4" />
                    </video>
                    {/* Video duration overlay */}
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      Video
                    </div>
                  </div>
                  
                  {/* Image */}
                  <div className={`w-full rounded-xl overflow-hidden bg-white ${getAspectClass(post.id + '_image', hasImage)}`}>
                    <img 
                      src={hasImage} 
                      alt={`Post by ${postAccountName}`}
                      className="w-full h-full object-cover"
                      onLoad={() => detectImageAspect(post.id + '_image', hasImage)}
                    />
                  </div>
                </div>
              ) : (
                // Single media type
                <div className={`w-full rounded-xl overflow-hidden bg-white relative ${getAspectClass(post.id, mediaUrl)}`}>
                  {isVideoContent ? (
                    <video 
                      className="w-full h-full object-cover"
                      poster={post.thumbnail_url}
                      controls
                      preload="metadata"
                      playsInline
                    >
                  <source src={mediaUrl} type="video/mp4" />
                </video>
                  ) : (
                    <img 
                      src={mediaUrl} 
                      alt={`Post by ${postAccountName}`}
                      className="w-full h-full object-cover"
                      onLoad={() => detectImageAspect(post.id, mediaUrl)}
                    />
                  )}
                  
                  {/* Video duration overlay */}
                  {isVideoContent && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      Video
                    </div>
                  )}
                  
                  {/* Carousel indicator */}
                  {isCarousel && (
                    <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                      <FaImages className="text-xs" />
                      <span>+N</span>
                    </div>
                  )}
                </div>
              )}

              {/* Engagement */}
              <div className="px-6 py-3 border-b border-gray-100">
                <div className="flex items-center space-x-4 text-gray-600">
                  <div className="flex items-center space-x-1">
                    <FaHeart className="text-lg" />
                    <span className="text-sm font-medium">{likes.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <FaComment className="text-lg" />
                    <span className="text-sm font-medium">{comments.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Caption */}
              {caption && (
                <div className="px-6 py-4">
                  <p className="text-gray-900 text-sm leading-relaxed break-words">
                    <span className="font-semibold text-gray-900 mr-2">{postAccountName}</span>
                    {displayCaption}
                  </p>
                  {caption.length > 150 && (
                    <button
                      onClick={() => toggleCaptionExpansion(post.id)}
                      className="text-gray-500 text-sm mt-1 hover:text-gray-700 transition-colors"
                    >
                      {isCaptionExpanded ? 'Show less' : 'See more'}
                    </button>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="px-6 py-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {timeAgo(post.timestamp)}
              </div>
                {post.permalink && (
                    <a 
                      href={post.permalink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-600 text-xs hover:text-blue-700 transition-colors"
                    >
                    View on Instagram
                  </a>
                )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 