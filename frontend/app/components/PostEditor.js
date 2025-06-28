'use client';

export default function PostEditor({
  message,
  setMessage,
  youtubeConfig,
  setYoutubeConfig,
  mediaFiles,
  setMediaFiles,
  selectedPlatforms,
  handlePublish,
  isPublishing,
  status,
}) {
  const isSelected = (platform) => selectedPlatforms.includes(platform);

  const handleMediaChange = (e) => {
    setMediaFiles([...e.target.files]);
  };

  return (
    <main className="flex-grow bg-white rounded-lg shadow-sm p-8 border border-gray-200 flex flex-col space-y-8">
      <h2 className="text-2xl font-semibold text-gray-800">Write Your Post</h2>

      <textarea
        rows={8}
        className="border border-gray-300 rounded-md p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 text-base"
        placeholder="Write your caption here..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      {/* Media upload */}
      <div>
        <label className="block mb-3 font-semibold text-gray-800 text-base">Upload Media</label>
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleMediaChange}
          className="text-gray-700 rounded cursor-pointer"
        />
        {mediaFiles.length > 0 && (
          <div className="mt-4 flex gap-4 flex-wrap">
            {mediaFiles.map((file, i) => {
              const url = URL.createObjectURL(file);
              if (file.type.startsWith('video/')) {
                return (
                  <video
                    key={i}
                    src={url}
                    controls
                    className="w-28 h-28 rounded-md shadow-sm border border-gray-300 object-cover"
                    onLoadedData={() => URL.revokeObjectURL(url)}
                  />
                );
              }
              return (
                <img
                  key={i}
                  src={url}
                  alt="upload preview"
                  className="w-28 h-28 rounded-md shadow-sm border border-gray-300 object-cover"
                  onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* YouTube extra fields */}
      {isSelected('youtube') && (
        <div className="border border-gray-300 rounded-md bg-gray-50 p-5 space-y-4">
          <label className="block font-semibold text-gray-800 text-base">YouTube Title</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md p-3 text-gray-800 text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={youtubeConfig.title}
            onChange={(e) =>
              setYoutubeConfig((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Enter YouTube video title"
          />
          <label className="block font-semibold text-gray-800 text-base">YouTube Description</label>
          <textarea
            rows={4}
            className="w-full border border-gray-300 rounded-md p-3 text-gray-800 text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={youtubeConfig.description}
            onChange={(e) =>
              setYoutubeConfig((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Enter YouTube video description"
          />
        </div>
      )}

      {/* Publish button */}
      <div className="pt-6 border-t border-gray-200 flex flex-col gap-3">
        <button
          disabled={selectedPlatforms.length === 0 || isPublishing}
          onClick={handlePublish}
          className={`px-6 py-3 rounded-md font-semibold text-white text-base transition-colors ${
            selectedPlatforms.length === 0 || isPublishing
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isPublishing ? 'Publishing...' : 'Publish Post'}
        </button>

        {/* Optional feedback per platform */}
        <div>
          {status.map(({ platform, success, error }, i) => (
            <p key={i} className={`text-sm ${success ? 'text-green-600' : 'text-red-600'}`}>
              {platform}: {success ? 'Published successfully' : `Failed to publish (${error})`}
            </p>
          ))}
        </div>
      </div>
    </main>
  );
}
