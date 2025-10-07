'use client';

import React, { useState } from 'react';
import {
  FaRetweet,
  FaHeart,
  FaReply,
  FaEllipsisH,
  FaGlobeAmericas,
  FaLock,
  FaUsers
} from 'react-icons/fa';
import MediaViewer from '../MediaViewer';
 
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

// Convert HTML to plain text
function toPlainText(html) {
  const el = document.createElement('div');
  el.innerHTML = html || '';
  return (el.textContent || '').replace(/\u00A0/g, ' ').trim();
}

// Get aspect ratio class based on media dimensions
function getAspectClass(attachment) {
  const w = attachment.meta?.original?.width ?? attachment.meta?.small?.width;
  const h = attachment.meta?.original?.height ?? attachment.meta?.small?.height;
  const r = w && h ? w / h : 1;
  
  console.log('Media dimensions:', { w, h, r, attachment });
  
  if (r > 1.2) return "aspect-video";
  if (r < 0.9) return "aspect-[4/5]";
  return "aspect-square";
}
 
export default function MastodonPosts({ posts, loading, error, searchQuery, setSearchQuery, selectedAccounts = [] }) {
  console.log('MastodonPosts component rendered with:', {
    postsCount: posts?.length || 0,
    loading,
    error,
    selectedAccountsCount: selectedAccounts?.length || 0,
    firstPost: posts?.[0]
  });

  const [mediaViewer, setMediaViewer] = useState({
    isOpen: false,
    attachments: [],
    caption: '',
    currentIndex: 0
  });

  const openMediaViewer = (attachments, caption, index = 0) => {
    console.log('Opening MediaViewer with:', {
      attachments,
      caption,
      index,
      attachmentsLength: attachments?.length
    });
    setMediaViewer({
      isOpen: true,
      attachments,
      caption,
      currentIndex: index
    });
  };

  const closeMediaViewer = () => {
    setMediaViewer({
      isOpen: false,
      attachments: [],
      caption: '',
      currentIndex: 0
    });
  };

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
          // Use account-specific metadata if available (for multi-account posts)
          const postAccountName = post._accountName || post.account?.display_name || post.account?.username || 'Mastodon User';
          const postAccountAvatar = post._accountAvatar || post.account?.avatar || '/default-avatar.png';
          const postAccountHandle = post.account?.acct || post.account?.username || 'user';
          
          console.log('Post account data:', {
            _accountName: post._accountName,
            _accountAvatar: post._accountAvatar,
            account: post.account,
            postAccountName,
            postAccountAvatar,
            postAccountHandle
          });
          
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
            <div key={post.id} className="rounded-2xl ring-1 ring-black/5 bg-white shadow-sm p-5 flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={postAccountAvatar}
                    alt={postAccountName}
                    className="w-8 h-8 rounded-full"
                    onError={(e) => {
                      e.target.src = '/default-avatar.png';
                    }}
                  />
                  {account.bot && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      🤖
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate text-gray-900">
                    {postAccountName}
                  </div>
                  <div className="text-sm text-muted-foreground truncate flex items-center gap-1">
                    <span>@{postAccountHandle}</span>
                    <span>·</span>
                    <span>{timeAgo(post.created_at)}</span>
                    <span>·</span>
                    {getVisibilityIcon(post.visibility)}
                    {account.locked && <FaLock className="text-gray-400 text-xs" />}
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 ring-offset-2">
                  <FaEllipsisH className="text-gray-500 text-sm" />
                </button>
              </div>
 
              {/* Content */}
              <div className="text-gray-900 whitespace-pre-wrap break-words line-clamp-3">
                {toPlainText(post.content) || 'Toot content'}
              </div>
 
              {/* Media */}
              {post.media_attachments && post.media_attachments.length > 0 && (
                <div className={`grid gap-3 ${post.media_attachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {post.media_attachments.slice(0, 4).map((media, idx) => {
                    console.log('Media attachment:', media);
                    const aspectClass = getAspectClass(media);
                    return (
                      <div key={media.id || idx} className="rounded-xl overflow-hidden bg-white ring-1 ring-black/5">
                        {media.type === 'image' ? (
                          <div 
                            className={`w-full rounded-xl overflow-hidden bg-white ring-1 ring-black/5 ${aspectClass || 'aspect-square'} cursor-pointer`}
                            onClick={() => openMediaViewer(post.media_attachments, post.content, idx)}
                          >
                            <img
                              src={media.url || media.preview_url}
                              alt={media.description || 'Media attachment'}
                              className="w-full h-full object-cover hover:opacity-95 transition-opacity"
                              onError={(e) => {
                                console.log('Image error:', e.target.src);
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                              onLoad={() => console.log('Image loaded:', media.url)}
                            />
                            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-500 hidden">
                              <span>📷 Image</span>
                            </div>
                          </div>
                        ) : (media.type === 'gifv' || media.type === 'video') ? (
                          <div 
                            className={`w-full rounded-xl overflow-hidden bg-white ring-1 ring-black/5 ${aspectClass || 'aspect-video'} cursor-pointer`}
                            onClick={() => openMediaViewer(post.media_attachments, post.content, idx)}
                          >
                            <video
                              src={media.url || media.preview_url}
                              poster={media.preview_url}
                              crossOrigin="anonymous"
                              preload="metadata"
                              controls={media.type === 'video'}
                              autoPlay={media.type === 'gifv'}
                              loop={media.type === 'gifv'}
                              muted={media.type === 'gifv'}
                              playsInline
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.log('Video/GIF error:', e.target.error, 'URL:', media.url);
                                // Fallback to image if video fails
                                const img = document.createElement('img');
                                img.src = media.preview_url || media.url;
                                img.alt = media.description || 'Media attachment';
                                img.className = 'w-full h-full object-cover';
                                img.onError = () => {
                                  e.target.parentNode.innerHTML = '<div class="w-full h-full bg-gray-100 flex items-center justify-center text-gray-500"><span>📎 Media</span></div>';
                                };
                                e.target.parentNode.replaceChild(img, e.target);
                              }}
                              onLoadStart={() => console.log('Video/GIF loading started:', media.url)}
                              onLoadedData={() => console.log('Video/GIF data loaded:', media.url)}
                              onCanPlay={() => console.log('Video/GIF can play:', media.url)}
                            />
                          </div>
                        ) : (
                          <div className={`w-full rounded-xl overflow-hidden bg-white ring-1 ring-black/5 ${aspectClass || 'aspect-square'} flex items-center justify-center text-gray-500`}>
                            <span>📎 {media.type} attachment</span>
                          </div>
                        )}
                        {idx === 3 && post.media_attachments.length > 4 && (
                          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center text-white text-xl font-bold cursor-pointer hover:bg-opacity-50 transition-all">
                            +{post.media_attachments.length - 4}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
 
              {/* Action Buttons */}
              <div className="flex items-center justify-between text-muted-foreground">
                <button className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-blue-50 transition-colors text-gray-600 hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600 ring-offset-2">
                  <FaReply className="text-sm" />
                  <span className="font-medium text-sm">
                    Reply{replies > 0 ? ` ${replies}` : ''}
                  </span>
                </button>
                <button className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-green-50 transition-colors text-gray-600 hover:text-green-600 focus-visible:ring-2 focus-visible:ring-green-600 ring-offset-2">
                  <FaRetweet className="text-sm" />
                  <span className="font-medium text-sm">
                    Boost{reblogs > 0 ? ` ${reblogs}` : ''}
                  </span>
                </button>
                <button className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-red-50 transition-colors text-gray-600 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-600 ring-offset-2">
                  <FaHeart className="text-sm" />
                  <span className="font-medium text-sm">
                    Favourite{favourites > 0 ? ` ${favourites}` : ''}
                  </span>
                </button>
              </div>
 
              {/* View on Mastodon Link */}
              {post.url && (
                <div className="pt-2 border-t border-gray-100">
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 text-xs hover:underline flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-purple-600 ring-offset-2 rounded"
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

      {/* Media Viewer */}
      <MediaViewer
        isOpen={mediaViewer.isOpen}
        onClose={closeMediaViewer}
        attachments={mediaViewer.attachments}
        caption={mediaViewer.caption}
        currentIndex={mediaViewer.currentIndex}
      />
    </div>
  );
}
 