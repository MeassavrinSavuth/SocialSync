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

// Get real user profile data from props or context
const getProfileData = (platform, userProfiles) => {
  if (userProfiles && userProfiles[platform]) {
    return userProfiles[platform];
  }
  // Fallback to mock data if no real profile
  return {
    name: "Your Brand",
    avatar: "/default-avatar.png",
    timestamp: "Now",
  };
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

const FacebookPreview = ({ message, mediaFiles, userProfiles }) => {
  const profile = getProfileData('facebook', userProfiles);
  
  return (
    <div className="bg-white border border-blue-200 rounded-lg shadow-sm w-full min-h-80 max-h-96 ring-1 ring-blue-100">
      {/* Header */}
      <div className="flex items-center p-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            profile.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-grow min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{profile.name}</p>
          <p className="text-xs text-gray-500 flex items-center">
            <span>{profile.timestamp}</span>
            <span className="mx-1">•</span>
            <span>🌍</span>
          </p>
        </div>
        <FaEllipsisH className="text-gray-400 text-lg cursor-pointer hover:bg-gray-100 p-2 rounded-full" />
      </div>

      {/* Post Message */}
      {message && <div className="px-4 pb-3 text-sm text-gray-900 whitespace-pre-line leading-relaxed overflow-hidden break-words" style={{
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        maxHeight: '4.5rem',
        wordBreak: 'break-word'
      }}>{message}</div>}

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
                  alt="Facebook post"
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
                      controls
                      playsInline
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
          
          {/* Facebook carousel indicator */}
          {mediaFiles.length > 1 && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full">
              1/{mediaFiles.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const InstagramPreview = ({ message, mediaFiles, userProfiles }) => {
  const profile = getProfileData('instagram', userProfiles);
  
  return (
    <div className="bg-white border border-pink-200 rounded-lg shadow-sm w-full min-h-80 max-h-96 ring-1 ring-pink-100">
      {/* Header */}
      <div className="flex items-center p-3">
        <div className="w-8 h-8 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-full p-0.5 mr-3">
          <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-gray-800">{profile.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
        </div>
        <div className="flex-grow min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{profile.name}</p>
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
                controls
                playsInline
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
                      controls
                      playsInline
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

      {/* Caption */}
      {message && (
        <div className="p-3">
          <div className="text-sm">
            <span className="font-semibold mr-2">{profile.name}</span>
            <span className="text-gray-900 block overflow-hidden break-words" style={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              maxHeight: '4.5rem',
              wordBreak: 'break-word'
            }}>{message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const TwitterPreview = ({ message, mediaFiles, userProfiles }) => {
  const profile = getProfileData('twitter', userProfiles);
  
  return (
    <div className="bg-white border border-sky-200 rounded-lg shadow-sm w-full min-h-80 max-h-96 ring-1 ring-sky-100">
      {/* Header */}
      <div className="flex items-center p-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            profile.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-grow min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{profile.name}</p>
        </div>
        <FaEllipsisH className="text-gray-600 cursor-pointer" />
      </div>

      {/* Message */}
      {message && (
        <div className="px-3 pb-3">
          <div className="text-sm text-gray-900 break-words" style={{
            wordBreak: 'break-word'
          }}>{message}</div>
        </div>
      )}

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
                  alt="Twitter post"
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
                      controls
                      playsInline
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
          
          {/* Twitter carousel indicator */}
          {mediaFiles.length > 1 && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full">
              1/{mediaFiles.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const YoutubePreview = ({ message, mediaFiles, youtubeConfig, userProfiles }) => {
  const profile = getProfileData('youtube', userProfiles);
  
  return (
    <div className="bg-white border border-red-200 rounded-lg shadow-sm w-full min-h-80 max-h-96 ring-1 ring-red-100">
      {/* Video Thumbnail */}
      {mediaFiles && mediaFiles.length > 0 && (
        <div className="relative w-full aspect-square bg-black">
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
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              profile.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-grow min-w-0">
            <h3 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1 break-words" style={{
              wordBreak: 'break-word'
            }}>
              {youtubeConfig?.title || "Your Video Title"}
            </h3>
            <p className="text-xs text-gray-600 mb-1">{profile.name}</p>
            <p className="text-xs text-gray-500">42K views • 2 hours ago</p>
          </div>
          <FaEllipsisH className="text-gray-500 cursor-pointer mt-1" />
        </div>
        
        {/* Description preview - do not fallback to global message */}
        {youtubeConfig?.description && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-600 line-clamp-2 break-words" style={{
              wordBreak: 'break-word'
            }}>{youtubeConfig.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const MastodonPreview = ({ message, mediaFiles, userProfiles }) => {
  const profile = getProfileData('mastodon', userProfiles);

  return (
    <div className="bg-white border border-purple-200 rounded-lg shadow-sm w-full min-h-80 max-h-96 ring-1 ring-purple-100">
      {/* Header */}
      <div className="flex items-center p-3">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            profile.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-grow min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{profile.name}</p>
        </div>
        <FaEllipsisH className="text-gray-600 cursor-pointer" />
      </div>

      {/* Message */}
      {message && (
        <div className="px-3 pb-3">
          <div className="text-sm text-gray-900 break-words" style={{
            wordBreak: 'break-word'
          }}>{message}</div>
        </div>
      )}

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
                  alt="Mastodon post"
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
                      controls
                      playsInline
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
          
          {/* Mastodon carousel indicator */}
          {mediaFiles.length > 1 && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full">
              1/{mediaFiles.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const TelegramPreview = ({ message, mediaFiles, userProfiles }) => {
  const profile = getProfileData('telegram', userProfiles);

  return (
    <div className="bg-white border border-cyan-200 rounded-lg shadow-sm w-full min-h-80 max-h-96 ring-1 ring-cyan-100">
      {/* Header */}
      <div className="flex items-center p-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <FaTelegramPlane />
          )}
        </div>
        <div className="flex-grow min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{profile.name}</p>
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
                  alt="Telegram post"
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
                      controls
                      playsInline
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
          
          {/* Telegram carousel indicator */}
          {mediaFiles.length > 1 && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full">
              1/{mediaFiles.length}
            </div>
          )}
        </div>
      )}

      {/* Caption */}
      {message && (
        <div className="p-3">
          <div className="text-sm">
            <span className="text-gray-900 block overflow-hidden break-words" style={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              maxHeight: '4.5rem',
              wordBreak: 'break-word'
            }}>{message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default function PostPreview({ selectedPlatforms, message, mediaFiles, youtubeConfig, setMessage, userProfiles }) {
  
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
          <FacebookPreview message={message} mediaFiles={mediaFiles} userProfiles={userProfiles} />
        </div>
      )}
      
      {selectedPlatforms.includes('instagram') && (
        <div>
          <div className="flex items-center mb-2">
            <FaInstagram className="text-pink-600 mr-2" />
            <span className="text-sm font-medium text-gray-700">Instagram</span>
          </div>
          <InstagramPreview message={message} mediaFiles={mediaFiles} userProfiles={userProfiles} />
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
          <TwitterPreview message={message} mediaFiles={mediaFiles} userProfiles={userProfiles} />
        </div>
      )}
      
      {selectedPlatforms.includes('youtube') && (
        <div>
          <div className="flex items-center mb-2">
            <FaYoutube className="text-red-600 mr-2" />
            <span className="text-sm font-medium text-gray-700">YouTube</span>
          </div>
          <YoutubePreview message={message} mediaFiles={mediaFiles} youtubeConfig={youtubeConfig} userProfiles={userProfiles} />
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
          <MastodonPreview message={message} mediaFiles={mediaFiles} userProfiles={userProfiles} />
        </div>
      )}
      
      {selectedPlatforms.includes('telegram') && (
        <div>
          <div className="flex items-center mb-2">
            <FaTelegramPlane className="text-blue-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">Telegram</span>
          </div>
          <TelegramPreview message={message} mediaFiles={mediaFiles} userProfiles={userProfiles} />
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