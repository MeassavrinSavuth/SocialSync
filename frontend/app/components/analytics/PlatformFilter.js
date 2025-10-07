'use client';

import React from 'react';

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', color: 'bg-blue-600' },
  { id: 'instagram', name: 'Instagram', color: 'bg-pink-500' },
  { id: 'twitter', name: 'Twitter', color: 'bg-sky-500' },
  { id: 'youtube', name: 'YouTube', color: 'bg-red-600' },
  { id: 'mastodon', name: 'Mastodon', color: 'bg-purple-600' },
  { id: 'telegram', name: 'Telegram', color: 'bg-blue-500' }
];

// Note: With multiple accounts per platform, analytics will show aggregated data
// across all accounts for each selected platform

export default function PlatformFilter({ onPlatformChange, selectedPlatforms = [] }) {
  const handlePlatformToggle = (platformId) => {
    const newSelection = selectedPlatforms.includes(platformId)
      ? selectedPlatforms.filter(p => p !== platformId)
      : [...selectedPlatforms, platformId];
    
    onPlatformChange(newSelection);
  };

  const handleSelectAll = () => {
    onPlatformChange(PLATFORMS.map(p => p.id));
  };

  const handleClearAll = () => {
    onPlatformChange([]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">
          Platforms {selectedPlatforms.length > 0 && `(${selectedPlatforms.length} selected)`}:
        </label>
        <button
          onClick={handleSelectAll}
          className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
        >
          All
        </button>
        <button
          onClick={handleClearAll}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
        >
          Clear
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((platform) => {
          const isSelected = selectedPlatforms.includes(platform.id);
          return (
            <button
              key={platform.id}
              onClick={() => handlePlatformToggle(platform.id)}
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm transition-all ${
                isSelected
                  ? `${platform.color} text-white shadow-md`
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : platform.color}`}></div>
              {platform.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}