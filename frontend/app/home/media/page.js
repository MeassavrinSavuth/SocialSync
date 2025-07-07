'use client';

import React, { useState } from 'react';

const mockMedia = [
  {
    id: 1,
    url: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=facearea&w=400&h=400&q=80',
    type: 'image',
    tags: ['campaign', 'spring'],
    uploaded_by: 'Alice',
    created_at: '2024-06-01',
    name: 'spring.jpg',
  },
  {
    id: 2,
    url: 'https://images.unsplash.com/photo-1518715308788-3005759c61d4?auto=format&fit=facearea&w=400&h=400&q=80',
    type: 'image',
    tags: ['product'],
    uploaded_by: 'Bob',
    created_at: '2024-06-02',
    name: 'product.jpg',
  },
  {
    id: 3,
    url: 'https://sample-videos.com/video123/mp4/240/big_buck_bunny_240p_1mb.mp4',
    type: 'video',
    tags: ['promo'],
    uploaded_by: 'Carol',
    created_at: '2024-06-03',
    name: 'bunny.mp4',
  },
];

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'image', label: 'Photos' },
  { key: 'video', label: 'Videos' },
];

const TAGS = ['campaign', 'spring', 'product', 'promo'];

export default function MediaLibraryPage() {
  const [selectedTab, setSelectedTab] = useState('media');
  const [selectedType, setSelectedType] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  const filteredMedia = mockMedia.filter((m) => {
    const matchesType = selectedType === 'all' || m.type === selectedType;
    const matchesTag = !selectedTag || m.tags.includes(selectedTag);
    const matchesSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesTag && matchesSearch;
  });

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        <button className={`px-6 py-3 rounded-t-lg text-lg font-semibold ${selectedTab === 'tasks' ? 'bg-gray-100 text-gray-700' : 'text-gray-400 bg-transparent'}`} onClick={() => setSelectedTab('tasks')}>Tasks</button>
        <button className={`px-6 py-3 rounded-t-lg text-lg font-semibold ${selectedTab === 'drafts' ? 'bg-white border-b-2 border-blue-600 text-blue-700' : 'text-gray-400 bg-transparent'}`} onClick={() => setSelectedTab('drafts')}>Drafts</button>
        <button className={`px-6 py-3 rounded-t-lg text-lg font-semibold ${selectedTab === 'media' ? 'bg-white border-b-2 border-blue-600 text-blue-700' : 'text-gray-400 bg-transparent'}`} onClick={() => setSelectedTab('media')}>Media</button>
      </div>
      {/* Only show media library if Media tab is selected */}
      {selectedTab === 'media' && (
        <>
          <div className="flex flex-col md:flex-row md:items-center md:gap-4 mb-6">
            {/* Filter by type */}
            <div className="flex gap-2 mb-2 md:mb-0">
              {FILTERS.map(tab => (
                <button
                  key={tab.key}
                  className={`px-3 py-1 rounded text-sm font-semibold ${selectedType === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                  onClick={() => setSelectedType(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {/* Filter by tag */}
            <div className="flex gap-2 mb-2 md:mb-0">
              <span className="text-sm text-gray-500">Tags:</span>
              <button className={`px-2 py-0.5 rounded text-xs font-semibold ${selectedTag === '' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`} onClick={() => setSelectedTag('')}>All</button>
              {TAGS.map(tag => (
                <button key={tag} className={`px-2 py-0.5 rounded text-xs font-semibold ${selectedTag === tag ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`} onClick={() => setSelectedTag(tag)}>{tag}</button>
              ))}
            </div>
            {/* Search */}
            <input
              type="text"
              className="border border-gray-300 rounded px-2 py-1 text-sm flex-1 min-w-[180px]"
              placeholder="Search media..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {/* Media Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredMedia.length === 0 && (
              <div className="col-span-full text-center text-gray-400 py-12">No media found.</div>
            )}
            {filteredMedia.map(media => (
              <div key={media.id} className="bg-white rounded-xl shadow p-2 flex flex-col items-center border hover:border-blue-400 transition group">
                <div className="w-full h-36 flex items-center justify-center bg-gray-100 rounded mb-2 overflow-hidden">
                  {media.type === 'image' ? (
                    <img src={media.url} alt={media.name} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <video src={media.url} controls className="max-h-full max-w-full object-contain" />
                  )}
                </div>
                <div className="w-full flex flex-col items-start">
                  <span className="font-semibold text-xs text-gray-800 truncate max-w-[120px]" title={media.name}>{media.name}</span>
                  <div className="flex flex-wrap gap-1 mt-1 mb-2">
                    {media.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">{tag}</span>
                    ))}
                  </div>
                  <span className="text-xs text-gray-400">by {media.uploaded_by} • {media.created_at}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
} 