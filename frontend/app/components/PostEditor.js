'use client';

import { useRef, useState } from 'react';
import { uploadToCloudinary } from '../hooks/api/uploadToCloudinary';

export default function PostEditor({
  message,
  setMessage,
  mediaFiles,
  setMediaFiles,
  youtubeConfig,
  setYoutubeConfig,
  selectedPlatforms,
  handlePublish,
  isPublishing,
  status,
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]); // progress per file 0-100
  const [uploadControllers, setUploadControllers] = useState([]);
  const inputFileRef = useRef(null);

  // Handle media file selection and upload
  const handleMediaChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);

    // Create new AbortControllers for each file
    const controllers = files.map(() => new AbortController());
    setUploadControllers((prev) => [...prev, ...controllers]);

    try {
      const uploads = await Promise.all(
        files.map((file, index) =>
          uploadToCloudinary(
            file,
            (percent) => {
              setUploadProgress((prev) => {
                const newProgress = [...prev];
                newProgress[index] = percent;
                return newProgress;
              });
            },
            controllers[index].signal
          )
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
      if (inputFileRef.current) inputFileRef.current.value = null;
    }
  };

  // Cancel all ongoing uploads
  const cancelUploads = () => {
    uploadControllers.forEach((ctrl) => ctrl.abort());
    setUploading(false);
    setUploadControllers([]);
    setUploadProgress([]);
    if (inputFileRef.current) inputFileRef.current.value = null;
  };

  // Remove a single media file by index
  const removeMediaFile = (index) => {
    if (!setMediaFiles) return;
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Check if a media URL is a video (simple extension check)
  const isVideoFile = (url) => {
    return /\.(mp4|mov|avi|mkv|wmv|flv|webm)$/i.test(url) || url.includes('video');
  };

  return (
    <section className="flex-1 bg-white p-6 rounded-lg shadow border border-gray-200 flex flex-col">
      <h2 className="text-2xl font-semibold mb-4 text-gray-900">Create New Post</h2>

      <textarea
        className="border border-gray-300 rounded p-3 mb-4 resize-none min-h-[120px] focus:outline-blue-500"
        placeholder="Write your post message here..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={isPublishing || uploading}
      />

      {/* Media Upload Section */}
      <div>
        <label
          htmlFor="media-upload"
          className={`inline-block cursor-pointer px-4 py-2 rounded bg-blue-600 text-white font-semibold mb-2 ${
            isPublishing || uploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          Upload Media
        </label>
        <input
          id="media-upload"
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          ref={inputFileRef}
          onChange={handleMediaChange}
          disabled={isPublishing || uploading}
        />
      </div>

      {/* Upload Progress and Cancel */}
      {uploading && (
        <div className="my-2 space-y-2">
          {uploadProgress.map((percent, i) => (
            <div key={i} className="w-full bg-gray-200 rounded h-4">
              <div
                className="bg-blue-500 h-4 rounded"
                style={{ width: `${percent}%` }}
                aria-label={`Upload progress for file ${i + 1}`}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={cancelUploads}
            className="mt-2 px-3 py-1 rounded bg-red-500 text-white font-semibold hover:bg-red-600"
          >
            Cancel Uploads
          </button>
        </div>
      )}

      {/* Media Previews */}
      {mediaFiles && mediaFiles.length > 0 && (
        <div className="flex flex-wrap gap-4 mt-4">
          {mediaFiles.map((url, i) => {
            const isVideo = isVideoFile(url);
            return (
              <div
                key={i}
                className="relative w-28 h-28 rounded shadow overflow-hidden group border border-gray-300"
              >
                {isVideo ? (
                  <video src={url} controls className="w-full h-full object-cover" />
                ) : (
                  <img
                    src={url}
                    alt={`Media preview ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}

                <button
                  type="button"
                  onClick={() => removeMediaFile(i)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                  aria-label={`Remove media file ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* YouTube specific fields only if YouTube is selected */}
      {selectedPlatforms.includes('youtube') && (
        <div className="mt-6 space-y-4 border-t pt-4 border-gray-300">
          <div>
            <label htmlFor="yt-title" className="block font-medium mb-1 text-gray-800">
              YouTube Video Title <span className="text-red-600">*</span>
            </label>
            <input
              id="yt-title"
              type="text"
              value={youtubeConfig.title}
              onChange={(e) =>
                setYoutubeConfig((prev) => ({ ...prev, title: e.target.value }))
              }
              disabled={isPublishing || uploading}
              className="w-full border border-gray-300 rounded p-2 focus:outline-blue-500"
              placeholder="Enter video title"
              required
            />
          </div>

          <div>
            <label htmlFor="yt-description" className="block font-medium mb-1 text-gray-800">
              YouTube Video Description
            </label>
            <textarea
              id="yt-description"
              value={youtubeConfig.description}
              onChange={(e) =>
                setYoutubeConfig((prev) => ({ ...prev, description: e.target.value }))
              }
              disabled={isPublishing || uploading}
              className="w-full border border-gray-300 rounded p-2 resize-none min-h-[80px] focus:outline-blue-500"
              placeholder="Enter video description"
            />
          </div>
        </div>
      )}

      {/* Publish Button and Status */}
      <div className="mt-6 flex items-center space-x-4">
        <button
          type="button"
          onClick={handlePublish}
          disabled={
            isPublishing || uploading || selectedPlatforms.length === 0 || !message.trim()
          }
          className={`px-6 py-2 rounded font-semibold text-white ${
            isPublishing || uploading || selectedPlatforms.length === 0 || !message.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isPublishing ? 'Publishing...' : 'Publish Post'}
        </button>

        {status && (
          <p
            className={`font-medium ${
              status.success ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {status.message}
          </p>
        )}
      </div>
    </section>
  );
}
