'use client';
import React, { useState } from 'react';
import { FaUpload, FaImages, FaTimes, FaCheck } from 'react-icons/fa';
import { useMedia } from '../../hooks/api/useMedia';

export default function MediaSelector({ workspaceId, onMediaSelect, selectedMedia, onClose }) {
  const [activeTab, setActiveTab] = useState('library'); // 'library' or 'upload'
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedLibraryMedia, setSelectedLibraryMedia] = useState(selectedMedia ? [selectedMedia] : []);
  
  const { media, loading, error, uploadMedia, isUploading, uploadProgress, uploadSuccess, uploadError, uploadSpeed } = useMedia(workspaceId);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    // auto-start upload for the first selected file
    if (files && files[0]) {
      handleUploadNow(files[0]);
    }
  };

  const handleUploadNow = async (fileParam) => {
    const fileToUpload = fileParam || (selectedFiles && selectedFiles[0]);
    if (!fileToUpload) return null;
    try {
      const uploaded = await uploadMedia(fileToUpload, []);
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

    if (activeTab === 'upload' && selectedFiles.length > 0) {
      // trigger upload and wait for result
      await handleUploadNow();
      return;
    }
  };

  const isConfirmDisabled = 
    (activeTab === 'library' && selectedLibraryMedia.length === 0) ||
    (activeTab === 'upload' && selectedFiles.length === 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col pointer-events-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Select Media</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FaTimes />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex mb-4 border-b">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'library'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('library')}
          >
            <FaImages className="inline mr-2" />
            Media Library
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'upload'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('upload')}
          >
            <FaUpload className="inline mr-2" />
            Upload New
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'library' && (
            <div>
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
            <div className="py-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center relative">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="media-upload"
                />
                <label htmlFor="media-upload" className="cursor-pointer block">
                  <FaUpload className="mx-auto text-4xl text-gray-400 mb-3" />
                  <p className="text-lg font-medium text-gray-700 mb-1">Click to choose a file</p>
                  <p className="text-sm text-gray-500">Supported: PNG, JPG, GIF, MP4, MOV</p>
                </label>

                {/* Progress overlay */}
                {isUploading && selectedFiles[0] && (
                  <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg flex flex-col items-center justify-center text-white p-4">
                    <div className="w-20 h-20 border-4 border-white border-t-transparent rounded-full animate-spin mb-3"></div>
                    <div className="font-semibold">Uploading {selectedFiles[0].name}</div>
                    <div className="text-sm mt-1">{uploadProgress}% • {uploadSpeed > 0 ? (uploadSpeed > 1024*1024 ? `${(uploadSpeed/(1024*1024)).toFixed(1)} MB/s` : `${Math.round(uploadSpeed/1024)} KB/s`) : ''}</div>
                  </div>
                )}

                {/* Success overlay */}
                {uploadSuccess && (
                  <div className="absolute inset-0 bg-green-600 bg-opacity-90 rounded-lg flex flex-col items-center justify-center text-white p-4">
                    <div className="text-2xl font-bold mb-1">Uploaded</div>
                    <div className="text-sm">Processing...</div>
                  </div>
                )}

                {/* Error overlay */}
                {uploadError && (
                  <div className="absolute inset-0 bg-red-50 rounded-lg flex flex-col items-center justify-center text-red-700 p-4">
                    <div className="font-semibold">Upload failed</div>
                    <div className="text-sm mt-1">{uploadError}</div>
                  </div>
                )}
              </div>

              {selectedFiles.length > 0 && (
                <div className="mt-4 flex flex-col items-center gap-3">
                  <div className="w-full max-w-md">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded p-3 mb-2">
                        <div className="text-sm text-gray-700 truncate">{file.name}</div>
                        <div className="text-xs text-gray-500">{Math.round(file.size/1024)} KB</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setSelectedFiles([])} className="px-4 py-2 bg-gray-100 rounded">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={`px-6 py-2 rounded font-medium transition ${
              isConfirmDisabled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
}
