'use client';

import { useRef, useState } from 'react';
import { uploadToCloudinary } from '../hooks/api/uploadToCloudinary';
import {
  FaFacebookF,
  FaInstagram,
  FaYoutube,
  FaTwitter,
  FaMastodon,
  FaCloudUploadAlt,
  FaTimes,
} from 'react-icons/fa';

const platformsList = ['facebook', 'instagram', 'youtube', 'twitter', 'mastodon'];

const platformIcons = {
  facebook: FaFacebookF,
  instagram: FaInstagram,
  youtube: FaYoutube,
  twitter: FaTwitter,
  mastodon: FaMastodon,
};

const platformColors = {
  facebook: '#1877F2',
  instagram: '#E4405F',
  youtube: '#FF0000',
  twitter: '#1DA1F2',
  mastodon: '#6364FF',
};

// Platform-specific configurations
const platformConfigs = {
  facebook: {
    characterLimit: 63206,
    name: 'Facebook',
    features: ['text', 'images', 'videos', 'links'],
    tips: 'Posts with images get 2.3x more engagement'
  },
  instagram: {
    characterLimit: 2200,
    name: 'Instagram',
    features: ['text', 'images', 'videos', 'hashtags'],
    tips: 'Use 5-10 hashtags for optimal reach'
  },
  youtube: {
    characterLimit: 5000,
    name: 'YouTube',
    features: ['videos', 'text', 'thumbnails'],
    tips: 'Video title should be 60 characters or less'
  },
  twitter: {
    characterLimit: 280,
    name: 'Twitter',
    features: ['text', 'images', 'videos', 'threads'],
    tips: 'Tweets with images get 150% more retweets'
  },
  mastodon: {
    characterLimit: 500,
    name: 'Mastodon',
    features: ['text', 'images', 'videos', 'polls'],
    tips: 'Use content warnings for sensitive topics'
  }
};

// Quick post templates
const postTemplates = [
  {
    id: 'announcement',
    name: '📢 Announcement',
    content: '🎉 Exciting news! [Your announcement here]\n\n✨ Here\'s what this means for you:\n• [Benefit 1]\n• [Benefit 2]\n• [Benefit 3]\n\n#announcement #news',
    platforms: ['facebook', 'twitter', 'instagram']
  },
  {
    id: 'question',
    name: '❓ Question/Poll',
    content: '🤔 Quick question for you:\n\n[Your question here?]\n\nA) [Option A]\nB) [Option B]\nC) [Option C]\n\nLet me know in the comments! 👇\n\n#poll #question #community',
    platforms: ['facebook', 'twitter', 'instagram', 'mastodon']
  },
  {
    id: 'tips',
    name: '💡 Tips & Advice',
    content: '💡 Pro tip: [Your main tip]\n\n🔥 Here\'s how to get started:\n1. [Step 1]\n2. [Step 2]\n3. [Step 3]\n\nTry it out and let me know how it goes!\n\n#tips #advice #protip',
    platforms: ['facebook', 'twitter', 'instagram']
  },
  {
    id: 'behind-scenes',
    name: '🎬 Behind the Scenes',
    content: '🎬 Behind the scenes: [What you\'re working on]\n\nIt\'s been an incredible journey so far... [Share your story]\n\n📸 Swipe to see the process!\n\n#behindthescenes #process #journey',
    platforms: ['instagram', 'facebook', 'youtube']
  },
  {
    id: 'quote',
    name: '✨ Inspirational Quote',
    content: '✨ "[Your inspiring quote]"\n\n💭 This really resonates with me because [your thoughts]...\n\nWhat\'s a quote that inspires you? Share below! 👇\n\n#inspiration #motivation #quote',
    platforms: ['facebook', 'twitter', 'instagram']
  },
  {
    id: 'video-post',
    name: '🎥 Video Content',
    content: '🎥 New video is live!\n\n[Brief description of your video content]\n\n🔔 Don\'t forget to:\n• Like if you enjoyed it\n• Subscribe for more\n• Share with friends\n\nLink in bio! 👆\n\n#video #content #youtube',
    platforms: ['youtube', 'facebook', 'twitter']
  }
];

export default function PostEditor({
  message,
  setMessage,
  mediaFiles,
  setMediaFiles,
  youtubeConfig,
  setYoutubeConfig,
  selectedPlatforms,
  togglePlatform,
  handlePublish,
  isPublishing,
  status,
  // New scheduling props
  isScheduled,
  setIsScheduled,
  scheduledDate,
  setScheduledDate,
  scheduledTime,
  setScheduledTime,
  handleSchedule,
  isScheduling,
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [uploadControllers, setUploadControllers] = useState([]);
  const inputFileRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showProgressBarSection, setShowProgressBarSection] = useState(false);
  
  // New state for enhanced features
  const [showTemplates, setShowTemplates] = useState(false);
  const [draggedMediaIndex, setDraggedMediaIndex] = useState(null);
  const [showPlatformTips, setShowPlatformTips] = useState(false);


  const isSelected = (platform) => selectedPlatforms.includes(platform);

  // Get character limit for selected platforms
  const getCharacterLimit = () => {
    if (selectedPlatforms.length === 0) return null;
    const limits = selectedPlatforms.map(platform => platformConfigs[platform]?.characterLimit || Infinity);
    return Math.min(...limits);
  };

  // Get remaining characters
  const getRemainingCharacters = () => {
    const limit = getCharacterLimit();
    if (!limit) return null;
    return limit - message.length;
  };

  // Apply template
  const applyTemplate = (template) => {
    setMessage(template.content);
    setShowTemplates(false);
    
    // Auto-select recommended platforms if none selected
    if (selectedPlatforms.length === 0) {
      template.platforms.forEach(platform => {
        if (!selectedPlatforms.includes(platform)) {
          togglePlatform(platform);
        }
      });
    }
  };

  // Media reordering functions
  const handleMediaDragStart = (e, index) => {
    setDraggedMediaIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleMediaDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleMediaDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedMediaIndex !== null && draggedMediaIndex !== dropIndex) {
      const newMediaFiles = [...mediaFiles];
      const draggedItem = newMediaFiles[draggedMediaIndex];
      
      // Remove dragged item
      newMediaFiles.splice(draggedMediaIndex, 1);
      
      // Insert at new position
      newMediaFiles.splice(dropIndex, 0, draggedItem);
      
      setMediaFiles(newMediaFiles);
    }
    
    setDraggedMediaIndex(null);
  };

  const handleMediaDragEnd = () => {
    setDraggedMediaIndex(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isPublishing && !uploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isPublishing || uploading) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    const mockEvent = { target: { files: droppedFiles } };
    handleMediaChange(mockEvent);
  };

  const handleMediaChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const containsVideo = files.some(file => file.type.startsWith('video/'));
    setShowProgressBarSection(containsVideo);

    setUploading(true);

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

      } else {
        console.error('Cloudinary upload error:', err);
      }
    } finally {
      setUploading(false);
      setUploadControllers([]);
      setUploadProgress([]);
      setShowProgressBarSection(false);
      if (inputFileRef.current) inputFileRef.current.value = null;
    }
  };

  const cancelUploads = () => {
    uploadControllers.forEach((ctrl) => ctrl.abort());
    setUploading(false);
    setUploadControllers([]);
    setUploadProgress([]);
    setShowProgressBarSection(false);
    if (inputFileRef.current) inputFileRef.current.value = null;
  };

  const removeMediaFile = (index) => {
    if (!setMediaFiles) return;
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const isVideoFile = (url) => /\.(mp4|mov|avi|mkv|wmv|flv|webm)$/i.test(url) || url.includes('video');

  return (
    <section className="flex flex-col h-full">
      <h2 className="text-2xl font-semibold mb-6 text-gray-900">Compose Your Post</h2>

      {/* Platform Selection Section */}
      <div className="mb-6 border-b pb-4 border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-gray-700">Select Platforms</h3>
          <button
            onClick={() => setShowPlatformTips(!showPlatformTips)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {showPlatformTips ? 'Hide Tips' : 'Show Platform Tips'}
          </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 mb-4">
          {platformsList.map((platform) => {
            const IconComponent = platformIcons[platform];
            const isPlatformSelected = isSelected(platform);
            const config = platformConfigs[platform];

            return (
              <div key={platform} className="relative group">
                <button
                  onClick={() => togglePlatform(platform)}
                  className={`flex items-center justify-center p-3 rounded-lg w-16 h-12 transition-all duration-200 ease-in-out relative
                    ${isPlatformSelected
                      ? 'bg-indigo-500 text-white shadow-lg transform scale-105'
                      : 'bg-gray-100 hover:bg-gray-200'
                    }
                  `}
                  style={isPlatformSelected ? {} : { color: platformColors[platform] }}
                  aria-pressed={isPlatformSelected}
                  aria-label={`Toggle ${platform} selection`}
                  title={platform.charAt(0).toUpperCase() + platform.slice(1)}
                  disabled={isPublishing}
                >
                  {IconComponent && <IconComponent className="text-2xl" />}
                </button>
                
                {/* Platform tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  {config.name} • {config.characterLimit === Infinity ? '∞' : config.characterLimit} chars
                </div>
              </div>
            );
          })}
        </div>

        {/* Platform-specific tips */}
        {showPlatformTips && selectedPlatforms.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Platform Tips</h4>
            <div className="space-y-2">
              {selectedPlatforms.map(platform => {
                const config = platformConfigs[platform];
                return (
                  <div key={platform} className="flex items-start space-x-2">
                    <span className="font-medium text-blue-700 min-w-0">{config.name}:</span>
                    <span className="text-blue-600 text-sm">{config.tips}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Quick Templates Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-gray-700">Quick Templates</h3>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded-md hover:bg-indigo-200 transition-colors duration-200"
          >
            {showTemplates ? 'Hide Templates' : 'Show Templates'}
          </button>
        </div>
        
        {showTemplates && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            {postTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => applyTemplate(template)}
                className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all duration-200 group"
                disabled={isPublishing || uploading}
              >
                <div className="font-medium text-gray-900 mb-1 group-hover:text-indigo-700">
                  {template.name}
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {template.platforms.map(p => platformConfigs[p].name).join(', ')}
                </div>
                <div className="text-sm text-gray-600 line-clamp-3">
                  {template.content.substring(0, 100)}...
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Message Textarea with Character Counter */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="post-message" className="block text-sm font-medium text-gray-700">
            Your Message
          </label>
          {selectedPlatforms.length > 0 && (
            <div className="flex items-center space-x-2">
              {(() => {
                const remaining = getRemainingCharacters();
                const isOverLimit = remaining !== null && remaining < 0;
                const isNearLimit = remaining !== null && remaining <= 50 && remaining > 0;
                
                return (
                  <span className={`text-sm font-medium ${
                    isOverLimit ? 'text-red-600' : 
                    isNearLimit ? 'text-yellow-600' : 
                    'text-gray-500'
                  }`}>
                    {remaining !== null ? (
                      <>
                        {message.length} / {getCharacterLimit()}
                        {isOverLimit && (
                          <span className="ml-1 text-red-600">
                            ({Math.abs(remaining)} over limit)
                          </span>
                        )}
                      </>
                    ) : (
                      `${message.length} characters`
                    )}
                  </span>
                );
              })()}
            </div>
          )}
        </div>
        <textarea
          id="post-message"
          className={`border rounded p-3 resize-none min-h-[120px] w-full focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 text-black ${
            (() => {
              const remaining = getRemainingCharacters();
              const isOverLimit = remaining !== null && remaining < 0;
              return isOverLimit 
                ? 'border-red-300 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500';
            })()
          }`}
          placeholder="Write your post message here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isPublishing || uploading}
        />
        
        {/* Character limit warning */}
        {(() => {
          const remaining = getRemainingCharacters();
          const isOverLimit = remaining !== null && remaining < 0;
          
          if (isOverLimit) {
            return (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <strong>Character limit exceeded!</strong> Some platforms may truncate your message.
              </div>
            );
          }
          return null;
        })()}
      </div>

      {/* Enhanced Media Previews with Drag & Drop Reordering */}
      {mediaFiles && mediaFiles.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">Media Files ({mediaFiles.length})</h4>
            {mediaFiles.length > 1 && (
              <span className="text-xs text-gray-500">Drag to reorder</span>
            )}
          </div>
          
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {mediaFiles.map((url, i) => {
              const isVideo = isVideoFile(url);
              const isDragging = draggedMediaIndex === i;
              
              return (
                <div
                  key={i}
                  draggable
                  onDragStart={(e) => handleMediaDragStart(e, i)}
                  onDragOver={(e) => handleMediaDragOver(e, i)}
                  onDrop={(e) => handleMediaDrop(e, i)}
                  onDragEnd={handleMediaDragEnd}
                  className={`relative aspect-square rounded-lg overflow-hidden group border-2 transition-all duration-200 cursor-move ${
                    isDragging 
                      ? 'border-blue-500 opacity-50 transform scale-105 shadow-lg' 
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  {/* Media order indicator */}
                  <div className="absolute top-1.5 left-1.5 bg-black bg-opacity-70 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center z-10 font-medium">
                    {i + 1}
                  </div>
                  {/* Media content */}
                  {isVideo ? (
                    <>
                      <video src={url} className="w-full h-full object-cover" muted />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 bg-black bg-opacity-70 rounded-full flex items-center justify-center">
                          <div className="w-0 h-0 border-l-[3px] border-l-white border-y-[2px] border-y-transparent ml-px"></div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <img
                      src={url}
                      alt={`Media ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeMediaFile(i)}
                    className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full w-5 h-5
                      flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 
                      transition-opacity duration-200 z-10 hover:bg-red-600 shadow-sm"
                    aria-label={`Remove media ${i + 1}`}
                  >
                    <FaTimes className="text-xs" />
                  </button>
                  
                  {/* Drag indicator overlay */}
                  <div className={`absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center 
                    opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                    mediaFiles.length === 1 ? 'hidden' : ''
                  }`}>
                    <div className="text-white text-xs font-medium bg-black bg-opacity-50 px-2 py-1 rounded">
                      ↕️ Drag
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Enhanced media management tips */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="text-sm text-blue-800 space-y-2">
              <div className="flex items-center font-medium">
                <span className="mr-2">💡</span>
                <span>Media Tips</span>
              </div>
              <div className="text-xs text-blue-700 space-y-1 pl-5">
                <div>• <strong>First image</strong> becomes the main preview on most platforms</div>
                {mediaFiles.length > 1 && (
                  <div>• <strong>Instagram:</strong> Maximum 10 photos/videos per post</div>
                )}
                {mediaFiles.some(url => isVideoFile(url)) && (
                  <div>• <strong>Videos:</strong> Keep under 2 minutes for better engagement</div>
                )}
                <div>• <strong>Aspect ratio:</strong> Square (1:1) works best across all platforms</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media Upload Section - with Drag & Drop - RESET TO OLD VERSION */}
      <div className="mb-4">
        <label
          htmlFor="media-upload"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 text-gray-600 cursor-pointer {/* Reverted classes */}
            ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'} {/* Reverted conditional */}
            ${isPublishing || uploading ? 'opacity-50 cursor-not-allowed' : ''} transition-all duration-200`}
        >
          <FaCloudUploadAlt className="text-3xl mb-2" />
          <p className="font-semibold text-center">Drag & drop your files here, or <span className="text-blue-600 hover:underline">click to upload</span></p> {/* Reverted text */}
          <p className="text-xs text-gray-500 mt-1">(Images or Videos)</p> {/* Reverted text */}
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
        </label>
      </div>

      {/* Upload Progress and Cancel */}
      {uploading && showProgressBarSection && (
        <div className="my-2 space-y-2">
          {uploadProgress.map((percent, i) => (
            <div key={i} className="flex items-center gap-2 w-full">
              <div className="relative w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${percent}%` }}
                  aria-label={`Upload progress for file ${i + 1}`}
                />
              </div>
              <span className="text-xs text-gray-700 font-medium w-10 text-right">{percent}%</span>
            </div>
          ))}
          <button
            type="button"
            onClick={cancelUploads}
            className="mt-2 px-3 py-1 rounded bg-red-500 text-white font-semibold hover:bg-red-600 transition"
          >
            Cancel Uploads
          </button>
        </div>
      )}

      {/* YouTube specific fields only if YouTube is selected */}
      {selectedPlatforms.includes('youtube') && (
        <div className="mt-6 space-y-4 border-t pt-4 border-gray-300">
          <h3 className="text-lg font-medium text-gray-700">YouTube Details</h3>
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
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-black"
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
              className="w-full border border-gray-300 rounded p-2 resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-black"
              placeholder="Enter video description"
            />
          </div>
        </div>
      )}

      {/* Scheduling Section */}
      {/* Clean Post Timing Section */}
      <div className="mb-6 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">When to publish</h3>
        
        {/* Clean Radio Options */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <label className={`relative flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
            !isScheduled 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 bg-gray-50 hover:border-gray-300'
          }`}>
            <input
              type="radio"
              name="postTiming"
              checked={!isScheduled}
              onChange={() => setIsScheduled(false)}
              className="w-4 h-4 text-blue-600 mr-3"
            />
            <div>
              <div className="font-medium text-gray-900">Publish now</div>
              <div className="text-sm text-gray-600">Post immediately</div>
            </div>
          </label>
          
          <label className={`relative flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
            isScheduled 
              ? 'border-purple-500 bg-purple-50' 
              : 'border-gray-200 bg-gray-50 hover:border-gray-300'
          }`}>
            <input
              type="radio"
              name="postTiming"
              checked={isScheduled}
              onChange={() => setIsScheduled(true)}
              className="w-4 h-4 text-purple-600 mr-3"
            />
            <div>
              <div className="font-medium text-gray-900">Schedule</div>
              <div className="text-sm text-gray-600">Choose date & time</div>
            </div>
          </label>
        </div>

        {/* Clean Scheduling Section */}
        {isScheduled && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required={isScheduled}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required={isScheduled}
                />
              </div>
            </div>
            
            {/* Clean Preview */}
            {scheduledDate && scheduledTime && (
              <div className="mt-4 p-3 bg-purple-50 rounded-md border border-purple-200">
                <p className="text-sm font-medium text-purple-900">
                  Scheduled for: {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clean Publish Buttons */}
      <div className="mt-6 space-y-4">
        {!isScheduled ? (
          <button
            type="button"
            onClick={handlePublish}
            disabled={
              isPublishing || uploading || selectedPlatforms.length === 0 || !message.trim()
            }
            className={`w-full px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 flex items-center justify-center space-x-2
              ${isPublishing || uploading || selectedPlatforms.length === 0 || !message.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            {isPublishing && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            <span>{isPublishing ? 'Publishing...' : 'Publish now'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSchedule}
            disabled={
              isScheduling || uploading || selectedPlatforms.length === 0 || !message.trim() || !scheduledDate || !scheduledTime
            }
            className={`w-full px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 flex items-center justify-center space-x-2
              ${isScheduling || uploading || selectedPlatforms.length === 0 || !message.trim() || !scheduledDate || !scheduledTime
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700'
              }`}
          >
            {isScheduling && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            <span>{isScheduling ? 'Scheduling...' : 'Schedule post'}</span>
          </button>
        )}

        {/* Clean Status Message */}
        {status && (
          <div className={`p-4 rounded-lg border ${
            status.success 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <p className="text-sm font-medium">{status.message}</p>
          </div>
        )}
      </div>
    </section>
  );
}