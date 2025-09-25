// components/PostQueue.js
'use client';

import React from 'react';

export default function PostQueue({ postQueue = [] }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'publishing':
        return 'text-blue-600 bg-blue-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getProgressBarColor = (status) => {
    switch (status) {
      case 'publishing':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getProgressValue = (item) => {
    if (item.status === 'completed') return 100;
    if (item.status === 'failed') return 0;
    if (item.status === 'publishing') return item.progress || 50; // Default to 50% if no progress specified
    if (item.status === 'pending') return 0;
    return 0;
  };

  return (
    <div className="space-y-4">
      {postQueue.length === 0 ? (
        <p className="text-gray-500 italic">No posts in the queue yet.</p>
      ) : (
        <ul className="space-y-3">
          {postQueue.map((item) => {
            const progressValue = getProgressValue(item);
            const showProgress = item.status === 'publishing' || item.status === 'pending';
            
            return (
              <li key={item.id} className="bg-gray-50 p-3 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-gray-800 capitalize">{item.platform}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusColor(item.status)} capitalize`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-sm text-gray-700 truncate mb-1">{item.messageSnippet}</p>
                {item.mediaCount > 0 && (
                  <p className="text-xs text-gray-500">{item.mediaCount} media file(s)</p>
                )}
                
                {/* Progress Bar */}
                {showProgress && (
                  <div className="mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-600">
                        {item.status === 'publishing' ? 'Publishing...' : 'Queued'}
                      </span>
                      <span className="text-xs text-gray-500">{progressValue}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ease-out ${getProgressBarColor(item.status)}`}
                        style={{ width: `${progressValue}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {item.status === 'failed' && item.error && (
                  <p className="text-xs text-red-500 mt-1">Error: {item.error}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}