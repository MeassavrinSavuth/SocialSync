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
  FaTelegramPlane,
} from 'react-icons/fa';

const platformsList = ['facebook', 'instagram', 'youtube', 'twitter', 'mastodon', 'telegram'];

const platformIcons = {
  facebook: FaFacebookF,
  instagram: FaInstagram,
  youtube: FaYoutube,
  twitter: FaTwitter,
  mastodon: FaMastodon,
  telegram: FaTelegramPlane,
};

const platformColors = {
  facebook: '#1877F2',
  instagram: '#E4405F',
  youtube: '#FF0000',
  twitter: '#1DA1F2',
  mastodon: '#6364FF',
  telegram: '#0088CC',
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
  features: ['text', 'images', 'videos'],
  tips: 'Tweets with images get 150% more retweets'
  },
  mastodon: {
    characterLimit: 500,
    name: 'Mastodon',
    features: ['text', 'images', 'videos', 'polls'],
    tips: 'Use content warnings for sensitive topics'
  },
  telegram: {
    characterLimit: 4096,
    name: 'Telegram',
    features: ['text', 'images', 'videos', 'links', 'files'],
    tips: 'Links automatically generate previews; disable if not needed.'
  }
};

// More explicit platform capabilities (precise to what our backend implements)
const platformCapabilities = {
  facebook: {
    supports: ['Text posts', 'Multiple images (carousel)', 'Single video upload', 'Scheduling'],
  notes: "Can: Post text, photos, videos, and schedule posts to a Facebook Page.\nCan't: Post to personal timelines from here — you must connect a Facebook Page and have Page access to publish."
  },
  instagram: {
    supports: ['Single image or video', 'Carousel posts (up to 10 items)', 'Captions', 'Scheduling'],
  notes: "Can: Publish photos, videos, and carousel posts (up to 10 items) with captions.\nCan't: Post Stories or Reels here; a Business or Creator Instagram account connected to a Page is required for direct publishing."
  },
  youtube: {
    supports: ['Video uploads', 'Title, description, tags', 'Thumbnails', 'Privacy (public/private)'],
  notes: "Can: Upload and schedule videos with title, description, and thumbnail.\nCan't: Start live streams from here — live streaming needs separate setup. A YouTube channel must be connected to publish."
  },
  twitter: {
    supports: ['Text tweets', 'Images', 'Single video uploads', 'Scheduling'],
  notes: "Can: Post tweets with text (up to 280 characters), images, and short videos.\nCan't: Post very long threads automatically — long content may need splitting; media size and format limits apply. Connect your X/Twitter account to post."
  },
  mastodon: {
    supports: ['Text posts', 'Images', 'Videos (single)', 'Visibility options (public/unlisted/private/direct)'],
  notes: "Can: Post text and add images or a single video to your Mastodon account, and choose visibility (public/unlisted/private/direct).\nCan't: Guarantee the same limits across instances — file size, attachment count, and character limits depend on the Mastodon server you use."
  },
  telegram: {
    supports: ['Text messages', 'Photos', 'Videos', 'Media groups (multiple photos)', 'Files'],
  notes: "Can: Send text, photos, videos, files, and media groups to channels or chats via a connected Telegram bot.\nCan't: Post as a regular user — the bot must be added with posting rights to the target channel or chat."
  }
};

// Quick post templates
const postTemplates = [
  {
    id: 'announcement',
    name: '📢 Announcement',
    content: '🎉 Exciting news! [Your announcement here]\n\n✨ Here\'s what this means for you:\n• [Benefit 1]\n• [Benefit 2]\n• [Benefit 3]\n\n#announcement #news',
    platforms: ['facebook', 'twitter', 'instagram', 'telegram']
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
    platforms: ['facebook', 'twitter', 'instagram', 'telegram']
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

  // Validation: YouTube requires at least one video file attached
  const youtubeRequiresVideo = selectedPlatforms.includes('youtube') && !(mediaFiles && mediaFiles.some(isVideoFile));

  // General media type detection
  const hasVideo = mediaFiles && mediaFiles.some(isVideoFile);
  const hasImage = mediaFiles && mediaFiles.some((url) => !isVideoFile(url));
  const isTextOnly = !mediaFiles || mediaFiles.length === 0;

  // Determine compatibility for each platform given current media
  const getPlatformCompatibility = (platform) => {
    switch (platform) {
      case 'youtube':
        return hasVideo ? 'ok' : 'blocked';
      case 'instagram':
        // Instagram via API requires media (no text-only posts)
        return (hasImage || hasVideo) ? 'ok' : 'blocked';
      case 'facebook':
        return 'ok';
      case 'twitter':
        return 'ok';
      case 'mastodon':
        return 'ok';
      case 'telegram':
        return 'ok';
      default:
        return 'ok';
    }
  };

  // Human-readable blocked reasons
  const getBlockedReason = (platform) => {
    switch (platform) {
      case 'youtube':
        return 'YouTube requires at least one video file.';
      case 'instagram':
        return 'Instagram requires at least one image or video (no text-only posts).';
      default:
        return 'This platform is not compatible with the selected media.';
    }
  };

  const blockedPlatforms = selectedPlatforms.filter((p) => getPlatformCompatibility(p) === 'blocked');

  // Non-blocking platform warnings
  const twitterHasMediaWarning = selectedPlatforms.includes('twitter') && (hasImage || hasVideo);
  const twitterWarningMessage = 'Our platform is currently using an unpaid API tier — this imposes stricter rate and size limits when forwarding media to Twitter/X; oversized or unsupported files may be rejected. Contact the platform admin to upgrade the plan for larger media uploads.';

  return (
    <section className="flex flex-col h-full">
      <h2 className="text-lg md:text-xl lg:text-2xl font-semibold mb-3 md:mb-4 lg:mb-6 text-gray-900">Compose Your Post</h2>

      {/* Platform Selection Section - Compact Design */}
      <div className="mb-3 md:mb-4 lg:mb-6 border-b pb-2 md:pb-3 lg:pb-4 border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 md:mb-3 space-y-1 sm:space-y-0">
          <h3 className="text-sm md:text-base lg:text-lg font-medium text-gray-700">Select Platforms</h3>
          <button
            onClick={() => setShowPlatformTips(!showPlatformTips)}
            className="text-xs md:text-sm text-blue-600 hover:text-blue-800 font-medium self-start sm:self-auto"
          >
            {showPlatformTips ? 'Hide Tips' : 'Show Platform Tips'}
          </button>
        </div>
        
        {/* Compact platform grid - better for sidebar open state */}
        <div className="grid grid-cols-3 sm:grid-cols-6 xl:grid-cols-3 gap-2 md:gap-3 mb-3 md:mb-4">
          {platformsList.map((platform) => {
            const IconComponent = platformIcons[platform];
            const isPlatformSelected = isSelected(platform);
            const config = platformConfigs[platform];

            return (
              <div key={platform} className="relative group">
                <button
                  onClick={() => togglePlatform(platform)}
                  className={`flex flex-col items-center justify-center p-2 md:p-3 rounded-lg w-full h-14 md:h-16 xl:h-14 transition-all duration-200 ease-in-out relative min-h-[44px]
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
                  {IconComponent && <IconComponent className="text-lg md:text-xl xl:text-lg" />}
                  {/* Compact platform name */}
                  <span className="text-xs mt-1 block font-medium truncate w-full text-center">
                    {config.name || platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </span>
                </button>
                
                {/* Platform tooltip - hidden on touch devices */}
                <div className="hidden lg:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  {config.name} • {config.characterLimit === Infinity ? '∞' : config.characterLimit} chars
                </div>
              </div>
            );
          })}
        </div>

        {/* Platform-specific capabilities (shows what each selected platform supports and important notes) */}
        {showPlatformTips && selectedPlatforms.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Platform capabilities</h4>
            <div className="space-y-3">
              {selectedPlatforms.map(platform => {
                const config = platformConfigs[platform] || {};
                const caps = platformCapabilities[platform] || { supports: [], notes: '' };
                return (
                  <div key={platform} className="p-3 bg-white rounded border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-800">{config.name || platform}</span>
                    </div>
                    <div className="text-sm text-gray-700 mb-1">
                      <strong>Supports:</strong> {caps.supports.join(', ') || '—'}
                    </div>
                    {caps.notes && (
                      <div className="text-xs text-gray-600">{caps.notes}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

  {/* Quick Templates removed per user request */}

      {/* Message Textarea - Compact and Adaptive */}
      <div className="mb-3 md:mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 md:mb-2 space-y-1 sm:space-y-0">
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
                  <span className={`text-xs font-medium ${
                    isOverLimit ? 'text-red-600' : 
                    isNearLimit ? 'text-yellow-600' : 
                    'text-gray-500'
                  }`}>
                    {remaining !== null ? (
                      <>
                        {message.length} / {getCharacterLimit()}
                        {isOverLimit && (
                          <span className="ml-1 text-red-600 block sm:inline">
                            ({Math.abs(remaining)} over)
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
          className={`border rounded-lg p-2 md:p-3 lg:p-4 resize-none min-h-[100px] md:min-h-[120px] lg:min-h-[140px] w-full focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 text-black text-sm md:text-base ${
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
          
          {/* Media tips removed per request */}
        </div>
      )}

      {/* Media Upload Section - Compact Design */}
      <div className="mb-3 md:mb-4">
        <label
          htmlFor="media-upload"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-3 md:p-4 lg:p-6 text-gray-600 cursor-pointer min-h-[70px] md:min-h-[80px] lg:min-h-[100px]
            ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}
            ${isPublishing || uploading ? 'opacity-50 cursor-not-allowed' : ''} transition-all duration-200`}
        >
          <FaCloudUploadAlt className="text-xl md:text-2xl lg:text-3xl mb-1 md:mb-2" />
          <p className="font-medium text-center text-xs md:text-sm lg:text-base">
            <span className="hidden md:inline">Drag & drop your files here, or </span>
            <span className="text-blue-600 hover:underline">
              <span className="md:hidden">Tap to upload</span>
              <span className="hidden md:inline">click to upload</span>
            </span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5 md:mt-1">(Images or Videos)</p>
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

      {/* Enhanced Upload Progress and Cancel - Mobile Optimized */}
      {uploading && (
        <div className="my-3 md:my-4 p-3 md:p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-blue-900">Uploading Media Files</h4>
            <span className="text-xs text-blue-700">
              {uploadProgress.filter(p => p === 100).length} of {uploadProgress.length} completed
            </span>
          </div>
          
          <div className="space-y-3">
            {uploadProgress.map((percent, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-700 font-medium">File {i + 1}</span>
                  <span className="text-xs text-gray-600 font-medium">{percent}%</span>
                </div>
                <div className="relative w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300 ease-out shadow-sm"
                    style={{ width: `${percent}%` }}
                    aria-label={`Upload progress for file ${i + 1}`}
                  />
                  {percent === 100 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <button
            type="button"
            onClick={cancelUploads}
            className="mt-3 w-full px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors text-sm min-h-[44px] flex items-center justify-center space-x-2"
          >
            <span>Cancel All Uploads</span>
            <span className="text-xs">({uploadProgress.length} files)</span>
          </button>
        </div>
      )}

      {/* YouTube specific fields - Mobile Optimized */}
      {selectedPlatforms.includes('youtube') && (
        <div className="mt-4 md:mt-6 space-y-3 md:space-y-4 border-t pt-3 md:pt-4 border-gray-300">
          <h3 className="text-base md:text-lg font-medium text-gray-700">YouTube Details</h3>
          <div>
            <label htmlFor="yt-title" className="block font-medium mb-1 text-gray-800 text-sm md:text-base">
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
              className="w-full border border-gray-300 rounded-lg p-3 md:p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-black text-sm md:text-base min-h-[44px]"
              placeholder="Enter video title"
              required
            />
          </div>

          <div>
            <label htmlFor="yt-description" className="block font-medium mb-1 text-gray-800 text-sm md:text-base">
              YouTube Video Description
            </label>
            <textarea
              id="yt-description"
              value={youtubeConfig.description}
              onChange={(e) =>
                setYoutubeConfig((prev) => ({ ...prev, description: e.target.value }))
              }
              disabled={isPublishing || uploading}
              className="w-full border border-gray-300 rounded-lg p-3 md:p-2 resize-none min-h-[80px] md:min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-black text-sm md:text-base"
              placeholder="Enter video description"
            />
          </div>

          <div>
            <label htmlFor="yt-privacy" className="block font-medium mb-1 text-gray-800 text-sm md:text-base">YouTube Privacy</label>
            <select
              id="yt-privacy"
              value={youtubeConfig.privacy || 'private'}
              onChange={(e) => setYoutubeConfig((prev) => ({ ...prev, privacy: e.target.value }))}
              disabled={isPublishing || uploading}
              className="w-full border border-gray-300 rounded-lg p-3 md:p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-black text-sm md:text-base min-h-[44px]"
            >
              <option value="public">Public</option>
              <option value="unlisted">Unlisted</option>
              <option value="private">Private</option>
            </select>
          </div>

          {/* Show confirmation when YouTube selected and a video is attached */}
          {selectedPlatforms.includes('youtube') && hasVideo && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 text-green-800 rounded text-sm">
              YouTube will be posted as <strong className="uppercase">{(youtubeConfig.privacy || 'private')}</strong> when published.
            </div>
          )}

          {/* YouTube validation: require a video file */}
          {youtubeRequiresVideo && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 text-red-800 rounded">
              <p className="text-sm font-medium">You selected YouTube but no video file is attached. Add a video file or unselect YouTube to continue.</p>
            </div>
          )}
        </div>
      )}

      {/* Scheduling Section */}
      {/* Post Timing Section - Compact Design */}
      <div className="mb-3 md:mb-4 lg:mb-6 p-3 md:p-4 lg:p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-sm md:text-base lg:text-lg font-semibold text-gray-900 mb-2 md:mb-3 lg:mb-4">When to publish</h3>
        
        {/* Compact Radio Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 mb-3 md:mb-4 lg:mb-6">
          <label className={`relative flex items-center p-2 md:p-3 lg:p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 min-h-[50px] md:min-h-[60px]
            ${!isScheduled 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 bg-gray-50 hover:border-gray-300'
          }`}>
            <input
              type="radio"
              name="postTiming"
              checked={!isScheduled}
              onChange={() => setIsScheduled(false)}
              className="w-4 h-4 text-blue-600 mr-2 md:mr-3 flex-shrink-0"
            />
            <div>
              <div className="font-medium text-gray-900 text-xs md:text-sm lg:text-base">Publish now</div>
              <div className="text-xs text-gray-600">Post immediately</div>
            </div>
          </label>
          
          <label className={`relative flex items-center p-2 md:p-3 lg:p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 min-h-[50px] md:min-h-[60px]
            ${isScheduled 
              ? 'border-purple-500 bg-purple-50' 
              : 'border-gray-200 bg-gray-50 hover:border-gray-300'
          }`}>
            <input
              type="radio"
              name="postTiming"
              checked={isScheduled}
              onChange={() => setIsScheduled(true)}
              className="w-4 h-4 text-purple-600 mr-2 md:mr-3 flex-shrink-0"
            />
            <div>
              <div className="font-medium text-gray-900 text-xs md:text-sm lg:text-base">Schedule</div>
              <div className="text-xs text-gray-600">Choose date & time</div>
            </div>
          </label>
        </div>

        {/* Compact Scheduling Section */}
        {isScheduled && (
          <div className="mt-3 md:mt-4 p-2 md:p-3 lg:p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 lg:gap-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-900 mb-1 md:mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-2 md:px-3 py-2 md:py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs md:text-sm lg:text-base min-h-[40px] md:min-h-[44px]"
                  required={isScheduled}
                />
              </div>
              
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-900 mb-1 md:mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-2 md:px-3 py-2 md:py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs md:text-sm lg:text-base min-h-[40px] md:min-h-[44px]"
                  required={isScheduled}
                />
              </div>
            </div>
            
            {/* Schedule Preview */}
            {scheduledDate && scheduledTime && (
              <div className="mt-2 md:mt-4 p-2 md:p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xs font-medium text-purple-900">
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

      {/* Compact Publish Buttons */}
      <div className="mt-4 md:mt-6 space-y-3 md:space-y-4">
        {/* Blocked platforms warning */}
        {blockedPlatforms.length > 0 && (
          <div className="p-2 md:p-3 bg-red-50 border border-red-200 rounded text-xs md:text-sm text-red-800">
            <p className="font-medium">Some selected platforms aren&apos;t compatible with the current media:</p>
            <ul className="mt-1 md:mt-2 list-disc list-inside space-y-0.5 md:space-y-1">
              {blockedPlatforms.map((p) => (
                <li key={p} className="text-xs md:text-sm">
                  <strong className="capitalize">{platformConfigs[p]?.name || p}:</strong> {getBlockedReason(p)}
                </li>
              ))}
            </ul>
            <p className="mt-1 md:mt-2 text-xs text-red-700">Unselect the blocked platforms or adjust your media to continue.</p>
          </div>
        )}

        {/* Twitter non-blocking media warning */}
        {twitterHasMediaWarning && (
          <div className="p-2 md:p-3 bg-yellow-50 border border-yellow-200 rounded text-xs md:text-sm text-yellow-800">
            <p className="font-medium">Note about Twitter</p>
            <p className="mt-1 text-xs md:text-sm">{twitterWarningMessage}</p>
            <p className="mt-1 text-xs text-yellow-700">You can still publish, but Twitter may reject unsupported or oversized media.</p>
          </div>
        )}
        {!isScheduled ? (
          <button
            type="button"
            onClick={handlePublish}
              disabled={
                isPublishing || uploading || selectedPlatforms.length === 0 || !message.trim() || blockedPlatforms.length > 0
              }
            className={`w-full px-3 md:px-4 lg:px-6 py-2.5 md:py-3 lg:py-4 rounded-lg font-medium text-white transition-all duration-200 flex items-center justify-center space-x-2 text-xs md:text-sm lg:text-base min-h-[44px] md:min-h-[48px] lg:min-h-[52px]
              ${isPublishing || uploading || selectedPlatforms.length === 0 || !message.trim() || blockedPlatforms.length > 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              }`}
          >
            {isPublishing && (
              <div className="w-3 md:w-4 h-3 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            <span>{isPublishing ? 'Publishing...' : 'Publish now'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSchedule}
            disabled={
              isScheduling || uploading || selectedPlatforms.length === 0 || !message.trim() || !scheduledDate || !scheduledTime || blockedPlatforms.length > 0
            }
            className={`w-full px-3 md:px-4 lg:px-6 py-2.5 md:py-3 lg:py-4 rounded-lg font-medium text-white transition-all duration-200 flex items-center justify-center space-x-2 text-xs md:text-sm lg:text-base min-h-[44px] md:min-h-[48px] lg:min-h-[52px]
              ${isScheduling || uploading || selectedPlatforms.length === 0 || !message.trim() || !scheduledDate || !scheduledTime || blockedPlatforms.length > 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800'
              }`}
          >
            {isScheduling && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            <span>{isScheduling ? 'Scheduling...' : 'Schedule post'}</span>
          </button>
        )}

        {/* Enhanced Status Message with Progress */}
        {status && (
          <div className={`p-4 rounded-lg border ${
            status.success 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{status.message}</p>
              {status.success && (
                <span className="text-green-600 text-lg">✓</span>
              )}
            </div>
            {status.progress && (
              <div className="mt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600">Publishing Progress</span>
                  <span className="text-xs text-gray-600">{status.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${status.progress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}