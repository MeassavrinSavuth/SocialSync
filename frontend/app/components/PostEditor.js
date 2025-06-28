'use client';

import { useState } from 'react';
import { uploadToCloudinary } from '../hooks/api/uploadToCloudinary';

export default function PostEditor({
  message,
  setMessage,
  youtubeConfig,
  setYoutubeConfig,
  mediaFiles = [],
  setMediaFiles,
  selectedPlatforms = [],
  handlePublish,
  isPublishing,
  status,
}) {
  const [uploading, setUploading] = useState(false);

  const handleMediaChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);

    try {
      const uploads = await Promise.all(files.map((file) => uploadToCloudinary(file)));
      if (typeof setMediaFiles === 'function') {
        setMediaFiles((prev) => [...(prev || []), ...uploads]);
      }
    } catch (err) {
      console.error('Cloudinary upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  // Delete media by index
  const handleDeleteMedia = (index) => {
    if (typeof setMediaFiles !== 'function') return;
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Optional: Replace media at index
  const handleReplaceMedia = async (e, index) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const upload = await uploadToCloudinary(file);
      setMediaFiles((prev) => {
        const newArr = [...(prev || [])];
        newArr[index] = upload;
        return newArr;
      });
    } catch (err) {
      console.error('Cloudinary upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const isSelected = (platform) => selectedPlatforms.includes(platform);

  return (
    <main className="flex-grow bg-white rounded-lg shadow-sm p-8 border border-gray-200 flex flex-col space-y-8">
      <h2 className="text-2xl font-semibold text-gray-800">Write Your Post</h2>

      <textarea
        rows={8}
        className="border border-gray-300 rounded-md p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 text-base"
        placeholder="Write your caption here..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={uploading || isPublishing}
      />

      <div>
        <label className="block mb-3 font-semibold text-gray-800 text-base">Upload Media</label>
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleMediaChange}
          className="text-gray-700 rounded cursor-pointer"
          disabled={uploading || isPublishing}
        />
        {uploading && <p className="text-sm text-blue-500 mt-2">Uploading...</p>}

        {Array.isArray(mediaFiles) && mediaFiles.length > 0 && (
          <div className="mt-4 flex gap-4 flex-wrap">
            {mediaFiles.map((url, i) => {
              const isVideo = url.includes('video');
              return (
                <div key={i} className="relative w-28 h-28 rounded shadow overflow-hidden">
                  {isVideo ? (
                    <video src={url} controls className="w-full h-full object-cover" />
                  ) : (
                    <img src={url} alt="preview" className="w-full h-full object-cover" />
                  )}

                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteMedia(i)}
                    disabled={uploading || isPublishing}
                    className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md"
                    aria-label="Delete media"
                    type="button"
                  >
                    &times;
                  </button>

                  {/* Optional Replace button: click icon or image to replace */}
                  {/* 
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => handleReplaceMedia(e, i)}
                    disabled={uploading || isPublishing}
                  />
                  */}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isSelected('youtube') && (
        <div className="border border-gray-300 rounded-md bg-gray-50 p-5 space-y-4">
          <label className="block font-semibold text-gray-800 text-base">YouTube Title</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md p-3"
            value={youtubeConfig.title}
            onChange={(e) => setYoutubeConfig((prev) => ({ ...prev, title: e.target.value }))}
            disabled={uploading || isPublishing}
          />
          <label className="block font-semibold text-gray-800 text-base">YouTube Description</label>
          <textarea
            rows={4}
            className="w-full border border-gray-300 rounded-md p-3"
            value={youtubeConfig.description}
            onChange={(e) => setYoutubeConfig((prev) => ({ ...prev, description: e.target.value }))}
            disabled={uploading || isPublishing}
          />
        </div>
      )}

      {status && (
        <p
          className={`mt-2 font-semibold ${
            status.success ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {status.message}
        </p>
      )}

      <div className="pt-6 border-t border-gray-200 flex justify-end">
        <button
          disabled={selectedPlatforms.length === 0 || uploading || isPublishing}
          onClick={handlePublish}
          className={`px-6 py-3 rounded-md font-semibold text-white text-base ${
            selectedPlatforms.length === 0 || uploading || isPublishing
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isPublishing ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              Publishing...
            </>
          ) : (
            'Publish Post'
          )}
        </button>
      </div>
    </main>
  );
}
