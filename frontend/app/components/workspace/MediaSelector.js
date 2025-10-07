'use client';
import React, { useState } from 'react';
import { FaUpload, FaImages, FaTimes, FaCheck } from 'react-icons/fa';
import { useMedia } from '../../hooks/api/useMedia';

export default function MediaSelector({ workspaceId, onMediaSelect, selectedMedia, onClose }) {
  const [activeTab, setActiveTab] = useState('library'); // 'library' or 'upload'
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedLibraryMedia, setSelectedLibraryMedia] = useState(selectedMedia ? [selectedMedia] : []);
  const [tags, setTags] = useState('');
  
  const { media, loading, error, uploadMedia, isUploading, uploadProgress, uploadSuccess, uploadError, uploadSpeed } = useMedia(workspaceId);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    // Don't auto-upload, let user add tags first
  };

  const handleUploadNow = async (fileParam) => {
    const fileToUpload = fileParam || (selectedFiles && selectedFiles[0]);
    if (!fileToUpload) return null;
    try {
      // Parse tags from comma-separated string
      const tagsArray = tags.trim() ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
      const uploaded = await uploadMedia(fileToUpload, tagsArray);
      if (uploaded && uploaded.id) {
        // select the uploaded media and close
        onMediaSelect(uploaded, 'library');
        onClose();
        return uploaded;
      }
      return null;
    } catch (err) {
      console.error('MediaSelector upload error:', err);
      return null;
    }
  };

  const handleLibraryMediaToggle = (mediaItem) => {
    setSelectedLibraryMedia(prev => {
      const isSelected = prev.some(m => m.id === mediaItem.id);
      if (isSelected) {
        return prev.filter(m => m.id !== mediaItem.id);
      } else {
        // For now, allow only single selection
        return [mediaItem];
      }
    });
  };

  const handleConfirm = async () => {
    if (activeTab === 'library' && selectedLibraryMedia.length > 0) {
      onMediaSelect(selectedLibraryMedia[0], 'library');
      onClose();
      return;
    }
    // Upload tab is handled by the Upload button in the upload section
  };

  const isConfirmDisabled = 
    (activeTab === 'library' && selectedLibraryMedia.length === 0);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 supports-[backdrop-filter]:backdrop-blur-sm supports-[backdrop-filter]:backdrop-saturate-150 transition-opacity duration-200 pointer-events-none">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl ring-1 ring-black/5 max-h-[80vh] overflow-hidden flex flex-col pointer-events-auto">
        {/* Header */}
        <div className="p-6 md:p-7">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Select Media</h3>
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-blue-600 ring-offset-2 rounded"
            >
              <FaTimes />
            </button>
          </div>
          <div className="mt-4 border-t border-gray-100"></div>

          {/* Tabs */}
          <div className="mt-6 mb-6">
            <div className="inline-flex rounded-xl p-1 ring-1 ring-black/5 bg-gray-50">
              <button
                className={`px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:text-gray-900 transition ${
                  activeTab === 'library'
                    ? 'bg-white text-gray-900 shadow'
                    : ''
                }`}
                onClick={() => setActiveTab('library')}
              >
                <FaImages className="inline mr-2" />
                Media Library
              </button>
              <button
                className={`px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:text-gray-900 transition ${
                  activeTab === 'upload'
                    ? 'bg-white text-gray-900 shadow'
                    : ''
                }`}
                onClick={() => setActiveTab('upload')}
              >
                <FaUpload className="inline mr-2" />
                Upload New
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 md:p-7 pt-0">
          {activeTab === 'library' && (
            <div className="grid grid-cols-1 place-items-center gap-6">
              {loading && (
                <div className="text-center py-8 text-gray-500">Loading media...</div>
              )}
              
              {error && (
                <div className="text-center py-8 text-red-500">Error loading media: {error}</div>
              )}
              
              {!loading && !error && media.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No media in library. Upload some media first!
                </div>
              )}
              
              {!loading && !error && media.length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {media.map(mediaItem => (
                    <div
                      key={mediaItem.id}
                      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                        selectedLibraryMedia.some(m => m.id === mediaItem.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleLibraryMediaToggle(mediaItem)}
                    >
                      <div className="aspect-square bg-gray-100 flex items-center justify-center">
                        {mediaItem.file_type === 'image' ? (
                          <img
                            src={mediaItem.file_url}
                            alt={mediaItem.original_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center relative">
                            <video
                              src={mediaItem.file_url}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 text-white">
                              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M8 5v10l8-5-8-5z"/>
                              </svg>
                            </div>
                          </div>
                        )}
                        {/* Fallback for broken images/videos */}
                        <div className="w-full h-full bg-gray-200 items-center justify-center text-gray-500 hidden">
                          <div className="text-center">
                            <div className="text-2xl mb-2">📁</div>
                            <div className="text-xs">{mediaItem.file_type}</div>
                          </div>
                        </div>
                      </div>
                      
                      {selectedLibraryMedia.some(m => m.id === mediaItem.id) && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                          <FaCheck className="text-xs" />
                        </div>
                      )}
                      
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2">
                        <p className="text-xs truncate">{mediaItem.original_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className={`grid gap-6 ${selectedFiles.length > 0 ? 'md:grid-cols-[5fr_4fr]' : 'grid-cols-1 place-items-center'}`}>
              {/* Upload Preview Area */}
              <div className="w-full max-w-[720px] mx-auto rounded-2xl ring-1 ring-black/5 bg-white overflow-hidden">
                <div className="w-full aspect-video md:aspect-[4/3] flex items-center justify-center bg-white relative">
                  {selectedFiles.length > 0 ? (
                    <>
                      {/* File Preview */}
                      <img
                        src={URL.createObjectURL(selectedFiles[0])}
                        alt="Selected media preview"
                        className="max-w-full max-h-[70vh] w-auto h-auto object-contain"
                        onLoad={(e) => e.target.style.display = 'block'}
                        style={{ display: 'none' }}
                      />
                      {/* Skeleton while loading */}
                      <div className="w-full h-full bg-gray-50 animate-pulse"></div>
                      
                      {/* Progress bar */}
                      {isUploading && (
                        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/10">
                          <div 
                            className="h-full bg-blue-600 transition-[width]"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      )}
                      
                      {/* Small spinner for unknown progress */}
                      {isUploading && uploadProgress === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="px-6 py-10 text-center text-sm text-gray-700">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="media-upload"
                      />
                      <label htmlFor="media-upload" className="cursor-pointer block">
                        <div className="border-2 border-dashed border-gray-300 rounded-2xl hover:border-gray-400 p-8">
                          <FaUpload className="mx-auto text-4xl text-gray-500 mb-3" />
                          <p className="text-lg font-medium text-gray-800 mb-1">Click to choose a file</p>
                          <p className="text-sm text-gray-600">Supported: PNG, JPG, GIF, MP4, MOV</p>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Error state */}
              {uploadError && (
                <div className="mt-3 rounded-xl bg-red-50 text-red-700 ring-1 ring-red-200 px-3 py-2 text-sm">
                  Upload failed: {uploadError}
                </div>
              )}

              {/* Side Panel - File Meta and Tags */}
              {selectedFiles.length > 0 && (
                <div className="w-full max-w-sm mx-auto md:mx-0 space-y-4">
                  {/* File Meta Row */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={selectedFiles[0]?.name || ''}
                      readOnly
                      className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 truncate focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
                    />
                    <div className="shrink-0 rounded-lg bg-gray-100 text-gray-700 text-xs px-2 py-1 ring-1 ring-gray-200">
                      {Math.round((selectedFiles[0]?.size || 0) / 1024)} KB
                    </div>
                  </div>

                  {/* Tags Input */}
                  <div>
                    <label htmlFor="media-tags" className="text-sm font-medium text-gray-800">
                      Tags (optional)
                    </label>
                    <input
                      type="text"
                      id="media-tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="Enter tags separated by commas (e.g., marketing, social, campaign)"
                      className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600 ring-offset-2"
                    />
                    <p className="mt-1 text-xs text-gray-600">Add tags to help organize your media</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 -mx-6 border-t border-gray-100 bg-white px-6 pt-4 flex justify-end gap-3 sticky bottom-0">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm text-gray-700 ring-1 ring-black/5 bg-white hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-600 ring-offset-2"
          >
            Cancel
          </button>
          {activeTab === 'library' && (
            <button
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
              className="rounded-xl px-4 py-2 text-sm bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-600 ring-offset-2"
            >
              Select
            </button>
          )}
          {activeTab === 'upload' && selectedFiles.length > 0 && (
            <button 
              onClick={() => handleUploadNow()} 
              disabled={isUploading}
              className="rounded-xl px-4 py-2 text-sm bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-600 ring-offset-2"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
