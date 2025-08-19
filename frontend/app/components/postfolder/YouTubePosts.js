'use client';

import React from 'react';
import { FaYoutube } from 'react-icons/fa';

function timeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

export default function YouTubePosts({ posts, loading, error, searchQuery, setSearchQuery }) {
  if (loading) {
    return (
      <div className="mt-8 max-w-4xl mx-auto">
        {/* Search bar */}
        <div className="mb-6 flex justify-center">
          <input
            type="text"
            placeholder="Search YouTube videos..."
            value={searchQuery || ''}
            onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
            className="border rounded-lg px-4 py-3 w-full max-w-md text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none shadow-sm bg-gray-50"
          />
        </div>
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 animate-pulse">
              <div className="flex flex-col md:flex-row gap-4 p-5">
                <div className="flex-shrink-0">
                  <div className="w-64 h-36 bg-gray-300 rounded-lg"></div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="h-6 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-300 rounded w-full"></div>
                    <div className="h-3 bg-gray-300 rounded w-4/5"></div>
                    <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                  </div>
                  <div className="flex gap-6 items-center pt-3 border-t">
                    <div className="h-4 bg-gray-300 rounded w-16"></div>
                    <div className="h-4 bg-gray-300 rounded w-16"></div>
                    <div className="h-4 bg-gray-300 rounded w-20"></div>
                    <div className="h-8 bg-gray-300 rounded w-24 ml-auto"></div>
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
      <div className="mt-8 max-w-4xl mx-auto">
        {/* Search bar */}
        <div className="mb-6 flex justify-center">
          <input
            type="text"
            placeholder="Search YouTube videos..."
            value={searchQuery || ''}
            onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
            className="border rounded-lg px-4 py-3 w-full max-w-md text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none shadow-sm bg-gray-50"
          />
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <FaYoutube className="text-red-500 text-4xl mx-auto mb-3" />
          <h3 className="text-lg font-medium text-red-800 mb-2">Unable to load YouTube videos</h3>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="mt-8 max-w-4xl mx-auto">
        {/* Search bar */}
        <div className="mb-6 flex justify-center">
          <input
            type="text"
            placeholder="Search YouTube videos..."
            value={searchQuery || ''}
            onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
            className="border rounded-lg px-4 py-3 w-full max-w-md text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none shadow-sm bg-gray-50"
          />
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <FaYoutube className="text-gray-400 text-5xl mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No YouTube videos found</h3>
          <p className="text-gray-500 text-sm">
            Connect your YouTube account or try refreshing to see your videos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 max-w-4xl mx-auto">
      {/* Search bar */}
      <div className="mb-6 flex justify-center">
        <input
          type="text"
          placeholder="Search YouTube videos..."
          value={searchQuery || ''}
          onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
          className="border rounded-lg px-4 py-3 w-full max-w-md text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none shadow-sm bg-gray-50"
        />
      </div>
      <div className="grid gap-6">
        {posts.map((video) => {
          const snippet = video.snippet || {};
          const stats = video.statistics || {};
          const thumbnails = snippet.thumbnails || {};
          const thumb = thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || '';
          return (
            <div key={video.id} className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 p-5 transition-transform hover:shadow-md hover:border-red-400 duration-150">
              {/* Thumbnail */}
              <div className="flex-shrink-0 relative group">
                <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer">
                  <img src={thumb} alt={snippet.title} className="w-64 h-36 object-cover rounded-lg border" />
                  {/* Play button overlay */}
                  <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                      <circle cx="28" cy="28" r="28" fill="#FF0000" fillOpacity="0.85" />
                      <polygon points="23,18 41,28 23,38" fill="#fff" />
                    </svg>
                  </span>
                </a>
              </div>
              {/* Video info */}
              <div className="flex-1 flex flex-col gap-2">
                <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="font-bold text-lg text-gray-900 hover:underline leading-snug">
                  {snippet.title}
                </a>
                {snippet.channelTitle && (
                  <div className="text-sm text-gray-600 mb-1">Channel: <span className="font-medium text-gray-800">{snippet.channelTitle}</span></div>
                )}
                <div className="text-xs text-gray-500">Published {timeAgo(snippet.publishedAt)}</div>
                <div className="text-gray-700 text-sm mt-1 line-clamp-3 whitespace-pre-line">{snippet.description}</div>
                {/* Stats bar */}
                <div className="flex gap-6 items-center text-gray-600 text-sm mt-2 border-t pt-2">
                  <div className="flex items-center gap-1" title="Views">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1.5 12s4-7.5 10.5-7.5S22.5 12 22.5 12s-4 7.5-10.5 7.5S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3.5"/></svg>
                    <span>{stats.viewCount}</span>
                    <span className="ml-1 text-xs hidden sm:inline">Views</span>
                  </div>
                  <div className="flex items-center gap-1" title="Likes">
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" /></svg>
                    <span>{stats.likeCount}</span>
                    <span className="ml-1 text-xs hidden sm:inline">Likes</span>
                  </div>
                  <div className="flex items-center gap-1" title="Comments">
                    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M18 13v-2a4 4 0 00-4-4H6.414l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 11H14a2 2 0 012 2v2a1 1 0 102 0z" /></svg>
                    <span>{stats.commentCount}</span>
                    <span className="ml-1 text-xs hidden sm:inline">Comments</span>
                  </div>
                  <a
                    href={`https://www.youtube.com/watch?v=${video.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto px-3 py-1 rounded bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors"
                  >
                    Watch on YouTube
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}