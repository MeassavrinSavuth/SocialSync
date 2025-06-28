export default function PostPreview({ selectedPlatforms, message, mediaFiles, youtubeConfig }) {
  return (
    <div className="w-1/3 bg-white rounded-lg shadow p-6 border border-gray-200 space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Preview</h2>

      <div>
        <p className="text-gray-700 whitespace-pre-line">{message}</p>
      </div>

      {mediaFiles.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {mediaFiles.map((url, i) => {
            if (url.includes('video')) {
              return (
                <video
                  key={i}
                  src={url}
                  controls
                  className="w-28 h-28 rounded shadow object-cover"
                />
              );
            }
            return (
              <img
                key={i}
                src={url}
                alt={`media-${i}`}
                className="w-28 h-28 rounded shadow object-cover"
              />
            );
          })}
        </div>
      )}

      {selectedPlatforms.includes('youtube') && (
        <div className="pt-4 border-t border-gray-300">
          <h3 className="font-medium text-gray-800 mb-2">YouTube Details</h3>
          <p className="text-sm text-gray-600"><strong>Title:</strong> {youtubeConfig.title}</p>
          <p className="text-sm text-gray-600"><strong>Description:</strong> {youtubeConfig.description}</p>
        </div>
      )}
    </div>
  );
}
