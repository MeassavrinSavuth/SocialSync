// components/PostPreview.js
'use client';

export default function PostPreview({ selectedPlatforms, message, mediaFiles, youtubeConfig }) {
  const isSelected = (platform) => selectedPlatforms.includes(platform);

  return (
    <aside className="w-96 bg-white rounded-lg shadow-sm p-8 border border-gray-200 ">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">Post Preview</h2>

      {/* Platforms */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2 text-gray-800 text-base">Posting To:</h3>
        <ul className="flex flex-wrap gap-3">
          {selectedPlatforms.length === 0 && (
            <li className="italic text-gray-400 text-sm">No platforms selected</li>
          )}
          {selectedPlatforms.map((p) => (
            <li
              key={p}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm capitalize font-medium"
            >
              {p}
            </li>
          ))}
        </ul>
      </div>

      {/* Message */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2 text-gray-800 text-base">Caption</h3>
        <p className="whitespace-pre-wrap text-gray-800 text-base">
          {message || <em className="text-gray-400">No message</em>}
        </p>
      </div>

      {/* Media preview */}
      {mediaFiles.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-3 text-gray-800 text-base">Media</h3>
          <div className="flex flex-wrap gap-3">
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
                  alt="media preview"
                  className="w-28 h-28 rounded-md shadow-sm border border-gray-300 object-cover"
                  onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* YouTube preview */}
      {isSelected('youtube') && (
        <div>
          <h3 className="font-semibold mb-3 text-gray-800 text-base">YouTube Details</h3>
          <p className="mb-1 text-gray-800 text-base">
            <strong>Title:</strong>{' '}
            {youtubeConfig.title || <em className="text-gray-400">No title</em>}
          </p>
          <p className="whitespace-pre-wrap text-gray-800 text-base">
            <strong>Description:</strong>{' '}
            {youtubeConfig.description || <em className="text-gray-400">No description</em>}
          </p>
        </div>
      )}
    </aside>
  );
}
