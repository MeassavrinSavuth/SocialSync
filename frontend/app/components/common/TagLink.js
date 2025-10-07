import React, { useState } from 'react';

const TagLink = ({ tag, mediaFiles, className = "" }) => {
  const [showMediaModal, setShowMediaModal] = useState(false);

  // Filter media files by tag
  const getMediaByTag = (tagName) => {
    return mediaFiles.filter(media => 
      media.tags && media.tags.includes(tagName)
    );
  };

  const handleTagClick = () => {
    const mediaWithTag = getMediaByTag(tag);
    if (mediaWithTag.length > 0) {
      setShowMediaModal(true);
    } else {
      // Show a simple alert if no media found
      alert(`No media files found with tag "@${tag}"`);
    }
  };

  const closeModal = () => {
    setShowMediaModal(false);
  };

  const mediaWithTag = getMediaByTag(tag);

  return (
    <>
      <span
        onClick={handleTagClick}
        className={`inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm cursor-pointer hover:bg-blue-200 transition-colors ${className}`}
        title={`Click to view ${mediaWithTag.length} media file(s) with tag "${tag}"`}
      >
        @{tag}
      </span>

      {/* Media Modal */}
      {showMediaModal && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 supports-[backdrop-filter]:backdrop-blur-sm">
          <div className="w-full max-w-5xl rounded-2xl bg-white/95 ring-1 ring-black/5 shadow-xl backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-center justify-between p-6 md:p-7 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Media with tag
                </h3>
                <span className="rounded-full bg-gray-100 text-gray-700 text-xs px-2.5 py-1">
                  @{tag}
                </span>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ring-offset-2 rounded-lg p-1"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            {/* Subline */}
            <div className="px-6 md:px-7 py-2">
              <p className="text-sm text-gray-600">
                Found {mediaWithTag.length} media file(s) with tag "@{tag}"
              </p>
            </div>

            {/* Content */}
            <div className="max-h-[85vh] overflow-auto p-6 md:p-7 space-y-5">
              {mediaWithTag.length === 0 ? (
                <div className="rounded-2xl ring-1 ring-black/5 bg-white p-10 text-center text-gray-600">
                  <div className="text-4xl mb-4">📁</div>
                  <p className="text-lg font-medium mb-2">No media files found</p>
                  <p className="text-sm">No media files found with tag "@{tag}"</p>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {mediaWithTag.map((media) => (
                    <div key={media.id} className="rounded-2xl ring-1 ring-black/5 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      {/* Thumbnail */}
                      <div className="bg-gray-50 w-full aspect-video grid place-items-center">
                        {media.file_type === 'image' ? (
                          <img
                            src={media.file_url}
                            alt={media.original_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center">
                            <div className="text-4xl mb-2">📹</div>
                            <div className="text-sm text-gray-600">Video</div>
                          </div>
                        )}
                      </div>

                      {/* Body */}
                      <div className="p-4 space-y-2">
                        <div 
                          className="text-sm font-medium text-gray-900 truncate"
                          title={media.original_name}
                        >
                          {media.original_name}
                        </div>
                        
                        <div className="text-xs text-gray-600">
                          <div>Type: {media.file_type}</div>
                          <div>Size: {Math.round(media.file_size / 1024)} KB</div>
                          {media.width && media.height && (
                            <div>Dimensions: {media.width} × {media.height}</div>
                          )}
                        </div>

                        {/* Tags */}
                        {media.tags && media.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {media.tags.map((tagName, index) => (
                              <span
                                key={index}
                                className="rounded-full bg-gray-100 text-gray-700 text-[11px] px-2 py-0.5"
                              >
                                {tagName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="p-4 pt-0 flex items-center justify-between">
                        <button
                          onClick={() => window.open(media.file_url, '_blank')}
                          className="h-9 rounded-lg bg-blue-600 text-white px-3 text-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ring-offset-2"
                          aria-label={`View ${media.original_name}`}
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = media.file_url;
                            link.download = media.original_name;
                            link.click();
                          }}
                          className="h-9 rounded-lg ring-1 ring-black/5 bg-white text-gray-700 px-3 text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ring-offset-2"
                          aria-label={`Download ${media.original_name}`}
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TagLink;
