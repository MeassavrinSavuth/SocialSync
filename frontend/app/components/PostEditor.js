'use client';

import { useState, useRef } from 'react';
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
  const [uploadProgress, setUploadProgress] = useState([]);
  const [uploadControllers, setUploadControllers] = useState([]); // For canceling
  const inputFileRef = useRef(null);

  const handleMediaChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);

    const controllers = files.map(() => new AbortController());
    setUploadControllers((prev) => [...prev, ...controllers]);

    try {
      const uploads = await Promise.all(
        files.map((file, index) =>
          uploadToCloudinary(file, (percent) => {
            setUploadProgress((prev) => {
              const newProgress = [...prev];
              newProgress[prev.length + index] = percent;
              return newProgress;
            });
          }, controllers[index].signal)
        )
      );
      if (typeof setMediaFiles === 'function') {
        setMediaFiles((prev) => [...(prev || []), ...uploads]);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Upload canceled');
      } else {
        console.error('Cloudinary upload error:', err);
      }
    } finally {
      setUploading(false);
      setUploadControllers([]);
      setUploadProgress([]);
      if (inputFileRef.current) {
        inputFileRef.current.value = null; // reset input
      }
    }
  };

  const cancelUpload = (index) => {
    if (uploadControllers[index]) {
      uploadControllers[index].abort();
    }
  };

  const handleDeleteMedia = (index) => {
    if (typeof setMediaFiles !== 'function') return;
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadProgress((prev) => prev.filter((_, i) => i !== index));
    setUploadControllers((prev) => prev.filter((_, i) => i !== index));
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
        {/* Custom styled file input button */}
        <button
          type="button"
          onClick={() => inputFileRef.current && inputFileRef.current.click()}
          disabled={uploading || isPublishing}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Choose Files
        </button>
        <input
          ref={inputFileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleMediaChange}
          className="hidden"
          disabled={uploading || isPublishing}
        />

        {uploading && (
          <p className="text-sm text-blue-500 mt-2">
            Uploading {uploadProgress.filter(p => p !== undefined).length} file
            {uploadProgress.filter(p => p !== undefined).length > 1 ? 's' : ''}...
          </p>
        )}

        {Array.isArray(mediaFiles) && mediaFiles.length > 0 && (
          <div className="mt-4 flex gap-4 flex-wrap">
            {mediaFiles.map((url, i) => {
              const isVideo = url.includes('video') || url.match(/\.(mp4|mov|avi|mkv)$/i);
              return (
                <div key={i} className="relative w-28 h-28 rounded shadow overflow-hidden group border border-gray-300">
                  {isVideo ? (
                    <video src={url} controls className="w-full h-full object-cover" />
                  ) : (
                    <img src={url} alt="preview" className="w-full h-full object-cover" />
                  )}

                  {/* Individual progress bar */}
                  {uploadProgress[i] !== undefined && uploadProgress[i] < 100 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                      <div
                        className="h-1 bg-blue-600 transition-all duration-300"
                        style={{ width: `${uploadProgress[i]}%` }}
                      />
                    </div>
                  )}

                  {/* Cancel button if uploading */}
                  {uploadProgress[i] !== undefined && uploadProgress[i] < 100 && (
                    <button
                      onClick={() => cancelUpload(i)}
                      className="absolute top-1 left-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md"
                      aria-label="Cancel upload"
                      type="button"
                      disabled={isPublishing}
                    >
                      ✕
                    </button>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteMedia(i)}
                    disabled={uploading || isPublishing}
                    className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md"
                    aria-label="Delete media"
                    type="button"
                  >
                    ✕
                  </button>
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
        <p className={`mt-2 font-semibold ${status.success ? 'text-green-600' : 'text-red-600'}`}>
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
