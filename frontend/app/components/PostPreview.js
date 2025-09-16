'use client';

import {
  FaEllipsisH,
  FaThumbsUp,
  FaCommentAlt,
  FaShare,
  FaInstagram,
  FaYoutube,
  FaTwitter,
  FaMastodon,
  FaFacebookF,
  FaHeart,
  FaRetweet,
  FaPlay,
  FaTelegramPlane,
} from 'react-icons/fa'; // Import icons

const mockProfile = { // Mock data for previews
  name: "Your Brand",
  avatar: "/default-avatar.png",
  timestamp: "Now",
};

const platformLimits = {
  twitter: 280,
  facebook: 63206,
  instagram: 2200,
  youtube: 5000,
  mastodon: 500,
  telegram: 4096,
};

const getCharacterWarning = (message, platform) => {
  const limit = platformLimits[platform];
  const length = message?.length || 0;
  const remaining = limit - length;
  
  if (remaining < 0) return { type: 'error', text: `${Math.abs(remaining)} chars over limit` };
  if (remaining <= 20) return { type: 'warning', text: `${remaining} chars left` };
  return null;
};

const getEngagementMetrics = (platform, messageLength) => {
  // Generate realistic engagement based on platform and content length
  const baseMetrics = {
    twitter: { likes: 156, retweets: 12, comments: 42 },
    facebook: { likes: 89, comments: 23, shares: 8 },
    instagram: { likes: 234, comments: 31 },
    youtube: { likes: 2340, dislikes: 12, comments: 178, views: 42000 },
    mastodon: { favorites: 67, boosts: 23, replies: 15 },
    telegram: { views: 5400, forwards: 15, comments: 34 }
  };
  
  // Adjust metrics based on content length (longer content = more engagement)
  const multiplier = Math.max(0.5, Math.min(2, messageLength / 100));
  const metrics = baseMetrics[platform];
  
  const adjusted = {};
  Object.keys(metrics).forEach(key => {
    adjusted[key] = Math.floor(metrics[key] * multiplier);
  });
  
  return adjusted;
};

const getBestPostingTime = (platforms) => {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Best posting times by platform
  const optimalTimes = {
    twitter: { weekday: [9, 13, 17], weekend: [11, 15] },
    facebook: { weekday: [9, 13, 15], weekend: [12, 14] },
    instagram: { weekday: [11, 14, 17], weekend: [10, 13] },
    youtube: { weekday: [14, 16, 20], weekend: [9, 11] },
    mastodon: { weekday: [10, 14, 18], weekend: [11, 15] },
    telegram: { weekday: [10, 14, 18], weekend: [12, 16] }
  };
  
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  // Check if current time is optimal for any selected platform
  for (const platform of platforms) {
    const times = optimalTimes[platform];
    const relevantTimes = isWeekend ? times.weekend : times.weekday;
    
    if (relevantTimes.includes(hour)) {
      return { optimal: true, platform, message: `Great time to post on ${platform}!` };
    }
  }
  
  // Find next optimal time
  const nextHour = (hour + 1) % 24;
  for (const platform of platforms) {
    const times = optimalTimes[platform];
    const relevantTimes = isWeekend ? times.weekend : times.weekday;
    
    for (const time of relevantTimes) {
      if (time > hour) {
        return { 
          optimal: false, 
          platform, 
          message: `Consider posting at ${time}:00 for better ${platform} engagement` 
        };
      }
    }
  }
  
  return null;
};

const suggestHashtags = (message, platforms) => {
  if (!message) return [];
  
  const keywords = message.toLowerCase().match(/\b\w{4,}\b/g) || [];
  const hashtagSuggestions = {
    'social': ['#SocialMedia', '#Community'],
    'business': ['#Business', '#Entrepreneur', '#Success'],
    'tech': ['#Tech', '#Innovation', '#Digital'],
    'marketing': ['#Marketing', '#Growth', '#Strategy'],
    'design': ['#Design', '#Creative', '#UX'],
    'food': ['#Food', '#Recipe', '#Cooking'],
    'travel': ['#Travel', '#Adventure', '#Explore'],
    'fitness': ['#Fitness', '#Health', '#Workout'],
    'photography': ['#Photography', '#Photo', '#Art']
  };
  
  const suggestions = [];
  keywords.forEach(word => {
    Object.entries(hashtagSuggestions).forEach(([key, tags]) => {
      if (word.includes(key) && suggestions.length < 3) {
        suggestions.push(...tags.slice(0, 2));
      }
    });
  });
  
  // Add platform-specific trending hashtags
  const trending = {
    twitter: ['#Trending', '#Breaking'],
    instagram: ['#InstaGood', '#PhotoOfTheDay'],
    facebook: ['#Community', '#Share'],
    youtube: ['#Video', '#Subscribe'],
    mastodon: ['#Fediverse', '#OpenSource'],
    telegram: ['#TelegramTips', '#Channel']
  };
  
  platforms.forEach(platform => {
    if (trending[platform] && suggestions.length < 5) {
      suggestions.push(trending[platform][0]);
    }
  });
  
  return [...new Set(suggestions)].slice(0, 4);
};

const isVideoFile = (url) => /\.(mp4|mov|avi|mkv|wmv|flv|webm)$/i.test(url) || url.includes('video');

const FacebookPreview = ({ message, mediaFiles }) => (
  <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
    {/* Header */}
    <div className="flex items-center p-4">
      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
        YB
      </div>
      <div className="flex-grow">
        <p className="font-semibold text-sm text-gray-900">{mockProfile.name}</p>
        <p className="text-xs text-gray-500 flex items-center">
          <span>{mockProfile.timestamp}</span>
          <span className="mx-1">•</span>
          <span>🌍</span>
        </p>
      </div>
      <FaEllipsisH className="text-gray-400 text-lg cursor-pointer hover:bg-gray-100 p-2 rounded-full" />
    </div>

    {/* Post Message */}
    {message && <div className="px-4 pb-3 text-sm text-gray-900 whitespace-pre-line leading-relaxed">{message}</div>}

    {/* Media Grid */}
    {mediaFiles && mediaFiles.length > 0 && (
      <div className={`relative w-full overflow-hidden ${
        mediaFiles.length === 1 ? '' : 
        mediaFiles.length === 2 ? 'grid grid-cols-2 gap-0.5' :
        mediaFiles.length === 3 ? 'grid grid-cols-2 gap-0.5' :
        'grid grid-cols-2 gap-0.5'
      }`}>
        {mediaFiles.slice(0, 4).map((url, i) => {
          const isVideo = isVideoFile(url);
          const showOverlay = mediaFiles.length > 4 && i === 3;
          
          return (
            <div 
              key={i} 
              className={`relative bg-gray-200 ${
                mediaFiles.length === 1 ? 'aspect-[4/3]' : 
                mediaFiles.length === 3 && i === 0 ? 'row-span-2 aspect-square' : 
                'aspect-square'
              }`}
            >
              {isVideo ? (
                <video 
                  src={url} 
                  className="w-full h-full object-cover"
                  muted
                />
              ) : (
                <img
                  src={url}
                  alt={`Media ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              )}
              
              {/* Video Play Button */}
              {isVideo && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 bg-black bg-opacity-70 rounded-full flex items-center justify-center">
                    <FaPlay className="text-white text-sm ml-0.5" />
                  </div>
                </div>
              )}
              
              {/* More photos overlay */}
              {showOverlay && (
                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                  <span className="text-white text-xl font-bold">
                    +{mediaFiles.length - 4}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}

    {/* Footer Actions */}
    <div className="p-4 border-t border-gray-200">
      <div className="flex justify-between items-center text-gray-500 text-sm">
        <button className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors group flex-1">
          <FaThumbsUp className="group-hover:text-blue-600 group-hover:scale-110 transition-all" />
          <span className="group-hover:text-blue-600">Like</span>
        </button>
        <button className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors group flex-1">
          <FaCommentAlt className="group-hover:text-green-600 group-hover:scale-110 transition-all" />
          <span className="group-hover:text-green-600">Comment</span>
        </button>
        <button className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors group flex-1">
          <FaShare className="group-hover:text-purple-600 group-hover:scale-110 transition-all" />
          <span className="group-hover:text-purple-600">Share</span>
        </button>
      </div>
    </div>
  </div>
);

const InstagramPreview = ({ message, mediaFiles }) => (
  <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
    {/* Header */}
    <div className="flex items-center p-3">
      <div className="w-8 h-8 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-full p-0.5 mr-3">
        <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-gray-800">YB</span>
        </div>
      </div>
      <div className="flex-grow">
        <p className="font-semibold text-sm text-gray-900">{mockProfile.name}</p>
      </div>
      <FaEllipsisH className="text-gray-600 cursor-pointer" />
    </div>

    {/* Media */}
    {mediaFiles && mediaFiles.length > 0 && (
      <div className="relative w-full aspect-square bg-gray-100">
        {mediaFiles.length === 1 ? (
          <div className="w-full h-full">
            {isVideoFile(mediaFiles[0]) ? (
              <video 
                src={mediaFiles[0]} 
                className="w-full h-full object-cover"
                muted
              />
            ) : (
              <img
                src={mediaFiles[0]}
                alt="Instagram post"
                className="w-full h-full object-cover"
              />
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-0.5 h-full">
            {mediaFiles.slice(0, 4).map((url, i) => (
              <div key={i} className="relative bg-gray-200">
                {isVideoFile(url) ? (
                  <video 
                    src={url} 
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  <img
                    src={url}
                    alt={`Media ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}
                {i === 3 && mediaFiles.length > 4 && (
                  <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                    <span className="text-white font-bold">+{mediaFiles.length - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Instagram carousel indicator */}
        {mediaFiles.length > 1 && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full">
            1/{mediaFiles.length}
          </div>
        )}
      </div>
    )}

    {/* Actions */}
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-4">
          <FaHeart className="text-xl cursor-pointer hover:text-red-500 transition-colors" />
          <FaCommentAlt className="text-xl cursor-pointer hover:text-gray-600 transition-colors" />
          <FaShare className="text-xl cursor-pointer hover:text-gray-600 transition-colors" />
        </div>
      </div>
      
      {/* Caption */}
      {message && (
        <div className="text-sm">
          <span className="font-semibold mr-2">{mockProfile.name}</span>
          <span className="text-gray-900">{message}</span>
        </div>
      )}
    </div>
  </div>
);

const TwitterPreview = ({ message, mediaFiles }) => {
  const metrics = getEngagementMetrics('twitter', message?.length || 0);
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start p-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3 flex-shrink-0">
          YB
        </div>
        <div className="flex-grow min-w-0">
          <div className="flex items-center space-x-1 mb-1">
            <p className="font-bold text-sm text-gray-900">{mockProfile.name}</p>
            <span className="text-blue-500">✓</span>
            <p className="text-sm text-gray-500">@yourbrand</p>
            <span className="text-gray-500">·</span>
            <p className="text-sm text-gray-500">{mockProfile.timestamp}</p>
          </div>
          
          {/* Tweet content */}
          {message && <div className="text-sm text-gray-900 mb-3 whitespace-pre-line">{message}</div>}
          
          {/* Media */}
          {mediaFiles && mediaFiles.length > 0 && (
            <div className={`rounded-xl overflow-hidden border border-gray-200 ${
              mediaFiles.length === 1 ? 'mb-3' : 
              mediaFiles.length === 2 ? 'grid grid-cols-2 gap-0.5 mb-3' :
              'grid grid-cols-2 gap-0.5 mb-3'
            }`}>
              {mediaFiles.slice(0, 4).map((url, i) => (
                <div key={i} className={`relative ${
                  mediaFiles.length === 1 ? 'aspect-video' : 'aspect-square'
                } bg-gray-100`}>
                  {isVideoFile(url) ? (
                    <video 
                      src={url} 
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <img
                      src={url}
                      alt={`Media ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex items-center justify-between max-w-md text-gray-500">
            <button className="flex items-center space-x-2 hover:text-blue-500 transition-colors group">
              <div className="p-2 rounded-full group-hover:bg-blue-50">
                <FaCommentAlt className="text-sm" />
              </div>
              <span className="text-sm">{metrics.comments}</span>
            </button>
            <button className="flex items-center space-x-2 hover:text-green-500 transition-colors group">
              <div className="p-2 rounded-full group-hover:bg-green-50">
                <FaRetweet className="text-sm" />
              </div>
              <span className="text-sm">{metrics.retweets}</span>
            </button>
            <button className="flex items-center space-x-2 hover:text-red-500 transition-colors group">
              <div className="p-2 rounded-full group-hover:bg-red-50">
                <FaHeart className="text-sm" />
              </div>
              <span className="text-sm">{metrics.likes}</span>
            </button>
            <button className="flex items-center space-x-2 hover:text-blue-500 transition-colors group">
              <div className="p-2 rounded-full group-hover:bg-blue-50">
                <FaShare className="text-sm" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const YoutubePreview = ({ message, mediaFiles, youtubeConfig }) => (
  <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
    {/* Video Thumbnail */}
    {mediaFiles && mediaFiles.length > 0 && (
      <div className="relative w-full aspect-video bg-black">
        {mediaFiles.map((url, i) => i === 0 && (
          isVideoFile(url) ? (
            <video key={i} src={url} className="w-full h-full object-cover" muted />
          ) : (
            <img key={i} src={url} alt="Video thumbnail" className="w-full h-full object-cover" />
          )
        ))}
        
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg hover:bg-red-700 transition-colors cursor-pointer">
            <FaPlay className="text-white text-lg ml-1" />
          </div>
        </div>
        
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded">
          2:34
        </div>
      </div>
    )}

    {/* Video info */}
    <div className="p-3">
      <div className="flex items-start space-x-3">
        <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          YB
        </div>
        <div className="flex-grow min-w-0">
          <h3 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">
            {youtubeConfig.title || message || "Your Video Title"}
          </h3>
          <p className="text-xs text-gray-600 mb-1">{mockProfile.name}</p>
          <p className="text-xs text-gray-500">42K views • 2 hours ago</p>
        </div>
        <FaEllipsisH className="text-gray-500 cursor-pointer mt-1" />
      </div>
      
      {/* Description preview */}
      {youtubeConfig.description && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-600 line-clamp-2">{youtubeConfig.description}</p>
        </div>
      )}
    </div>
  </div>
);

const MastodonPreview = ({ message, mediaFiles }) => {
  const metrics = getEngagementMetrics('mastodon', message?.length || 0);

  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center p-3 border-b border-gray-200">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
          YB
        </div>
        <div className="flex-grow">
          <p className="font-semibold text-sm text-gray-900">{mockProfile.name}</p>
          <p className="text-xs text-gray-500">@yourbrand@mastodon.social</p>
        </div>
        <span className="text-xs text-gray-500">{mockProfile.timestamp}</span>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Message */}
        {message && <div className="text-sm text-gray-900 mb-3 whitespace-pre-line">{message}</div>}

        {/* Media */}
        {mediaFiles && mediaFiles.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {mediaFiles.slice(0, 4).map((url, i) => (
              <div key={i} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                {isVideoFile(url) ? (
                  <video 
                    src={url} 
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  <img
                    src={url}
                    alt={`Media ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Actions */}
        <div className="flex items-center space-x-6 text-gray-500 text-sm">
          <button className="hover:text-purple-600 transition-colors flex items-center">
            <FaCommentAlt className="mr-1" />
            <span className="text-xs">{metrics.replies}</span>
          </button>
          <button className="hover:text-green-600 transition-colors flex items-center">
            <FaRetweet className="mr-1" />
            <span className="text-xs">{metrics.boosts}</span>
          </button>
          <button className="hover:text-yellow-600 transition-colors flex items-center">
            <FaHeart className="mr-1" />
            <span className="text-xs">{metrics.favorites}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const TelegramPreview = ({ message, mediaFiles }) => {
  const metrics = getEngagementMetrics('telegram', message?.length || 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center p-3 border-b border-gray-200">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
          <FaTelegramPlane />
        </div>
        <div className="flex-grow">
          <p className="font-semibold text-sm text-gray-900">{mockProfile.name}</p>
          <p className="text-xs text-gray-500">@yourbrand_channel</p>
        </div>
        <FaEllipsisH className="text-gray-400 text-lg cursor-pointer" />
      </div>

      {/* Media */}
      {mediaFiles && mediaFiles.length > 0 && (
        <div className="relative w-full bg-gray-100 aspect-video">
          {mediaFiles.slice(0, 1).map((url, i) => {
            const isVideo = isVideoFile(url);
            return isVideo ? (
              <video key={i} src={url} className="w-full h-full object-cover" muted />
            ) : (
              <img key={i} src={url} alt="Telegram media" className="w-full h-full object-cover" />
            );
          })}
        </div>
      )}

      {/* Message */}
      <div className="p-3">
        {message && <div className="text-sm text-gray-900 whitespace-pre-line mb-2">{message}</div>}
        <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
          <span>{mockProfile.timestamp}</span>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <FaPlay />
              <span>{metrics.views}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function PostPreview({ selectedPlatforms, message, mediaFiles, youtubeConfig, setMessage }) {
  
  // Show empty state if nothing to preview
  if (selectedPlatforms.length === 0 && !message?.trim() && (!mediaFiles || mediaFiles.length === 0)) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📱</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No preview yet</h3>
        <p className="text-gray-500 text-sm">
          Select platforms and start composing to see your post preview here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
  {/* Recommendations removed per user request */}

      {/* Platform Previews */}
      {selectedPlatforms.includes('facebook') && (
        <div>
          <div className="flex items-center mb-2">
            <FaFacebookF className="text-blue-600 mr-2" />
            <span className="text-sm font-medium text-gray-700">Facebook</span>
          </div>
          <FacebookPreview message={message} mediaFiles={mediaFiles} />
        </div>
      )}
      
      {selectedPlatforms.includes('instagram') && (
        <div>
          <div className="flex items-center mb-2">
            <FaInstagram className="text-pink-600 mr-2" />
            <span className="text-sm font-medium text-gray-700">Instagram</span>
          </div>
          <InstagramPreview message={message} mediaFiles={mediaFiles} />
        </div>
      )}
      
      {selectedPlatforms.includes('twitter') && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <FaTwitter className="text-blue-400 mr-2" />
              <span className="text-sm font-medium text-gray-700">Twitter</span>
            </div>
            {(() => {
              const warning = getCharacterWarning(message, 'twitter');
              return warning && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  warning.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {warning.text}
                </span>
              );
            })()}
          </div>
          <TwitterPreview message={message} mediaFiles={mediaFiles} />
        </div>
      )}
      
      {selectedPlatforms.includes('youtube') && (
        <div>
          <div className="flex items-center mb-2">
            <FaYoutube className="text-red-600 mr-2" />
            <span className="text-sm font-medium text-gray-700">YouTube</span>
          </div>
          <YoutubePreview message={message} mediaFiles={mediaFiles} youtubeConfig={youtubeConfig} />
        </div>
      )}
      
      {selectedPlatforms.includes('mastodon') && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <FaMastodon className="text-purple-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">Mastodon</span>
            </div>
            {(() => {
              const warning = getCharacterWarning(message, 'mastodon');
              return warning && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  warning.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {warning.text}
                </span>
              );
            })()}
          </div>
          <MastodonPreview message={message} mediaFiles={mediaFiles} />
        </div>
      )}
      
      {selectedPlatforms.includes('telegram') && (
        <div>
          <div className="flex items-center mb-2">
            <FaTelegramPlane className="text-blue-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">Telegram</span>
          </div>
          <TelegramPreview message={message} mediaFiles={mediaFiles} />
        </div>
      )}

      {/* Platform selection summary */}
      {selectedPlatforms.length > 0 && (
        <div className="pt-4 mt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Will post to {selectedPlatforms.length} platform{selectedPlatforms.length > 1 ? 's' : ''}
            </span>
            <div className="flex items-center space-x-1">
              {selectedPlatforms.map(platform => {
                const icons = {
                  facebook: FaFacebookF,
                  instagram: FaInstagram,
                  twitter: FaTwitter,
                  youtube: FaYoutube,
                  mastodon: FaMastodon,
                  telegram: FaTelegramPlane,
                };
                const colors = {
                  facebook: 'text-blue-600',
                  instagram: 'text-pink-600',
                  twitter: 'text-blue-400',
                  youtube: 'text-red-600',
                  mastodon: 'text-purple-600',
                  telegram: 'text-blue-500',
                };
                const IconComponent = icons[platform];
                return (
                  <IconComponent 
                    key={platform} 
                    className={`text-lg ${colors[platform]}`}
                    title={platform.charAt(0).toUpperCase() + platform.slice(1)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}