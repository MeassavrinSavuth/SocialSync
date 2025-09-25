'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useProtectedFetch } from '../../hooks/auth/useProtectedFetch';
import { FaFacebook, FaInstagram, FaYoutube, FaTwitter } from 'react-icons/fa';
import { SiMastodon } from 'react-icons/si';

const platformIcons = {
  facebook: FaFacebook,
  instagram: FaInstagram,
  youtube: FaYoutube,
  twitter: FaTwitter,
  mastodon: SiMastodon,
};

const platformColors = {
  facebook: 'text-blue-600',
  instagram: 'text-pink-500',
  youtube: 'text-red-600',
  twitter: 'text-sky-500',
  mastodon: 'text-purple-600',
};

export default function DashboardPage() {
  const router = useRouter();
  const protectedFetch = useProtectedFetch();
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScheduledPosts();
  }, []);

  const fetchScheduledPosts = async () => {
    try {
      const response = await protectedFetch('/scheduled-posts');
      
      if (!response) {
        console.error('Failed to fetch scheduled posts');
        return;
      }
      
      setScheduledPosts(response || []);
    } catch (err) {
      console.error('Error fetching scheduled posts:', err);
    } finally {
      setLoading(false);
    }
  };

  // return local YYYY-MM-DD (avoid toISOString which uses UTC and can shift the day)
  const formatDate = (date) => {
    return date.getFullYear() + '-' + 
           String(date.getMonth() + 1).padStart(2, '0') + '-' + 
           String(date.getDate()).padStart(2, '0');
  };

  const formatDisplayDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getCurrentWeekDays = () => {
    const today = new Date();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getCurrentWeekDateRange = () => {
    const weekDays = getCurrentWeekDays();
    const start = weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${start} - ${end}`;
  };

  const getPostsForDate = (date) => {
    const dateStr = formatDate(date);
    return scheduledPosts.filter(post => {
      const postDate = formatDate(new Date(post.scheduled_time));
      return postDate === dateStr;
    });
  };

  const weekDays = getCurrentWeekDays();

  return (
    <div className="min-h-screen bg-gray-50 p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header - Mobile Responsive */}
        <div className="mb-4 md:mb-6">
          
          <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-gray-900">Dashboard Overview</h1>
        </div>

        {/* Calendar Week View - Mobile Responsive */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 space-y-2 md:space-y-0">
            <div>
              <h3 className="text-base md:text-lg font-semibold text-gray-800">Next 7 Days Scheduled Posts</h3>
              <p className="text-xs md:text-sm text-gray-600">{getCurrentWeekDateRange()}</p>
            </div>
            <div className="text-xs md:text-sm text-gray-500">
              Starting from {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>

          {/* Mobile: Horizontal scroll, Desktop: Grid */}
          <div className="block md:hidden">
            <div className="flex gap-3 overflow-x-auto pb-4" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
              {weekDays.map((date, index) => {
                const postsForDay = getPostsForDate(date);
                const isToday = formatDate(date) === formatDate(new Date());
                
                return (
                  <div key={index} className={`flex-shrink-0 w-64 p-3 border rounded-xl bg-gradient-to-br from-white to-gray-50 shadow-lg min-h-[180px] ${
                    isToday 
                      ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100 ring-2 ring-blue-200' 
                      : 'border-gray-200'
                  }`}>
                    {/* Mobile Day Card Content */}
                    <div className="flex items-center justify-between mb-3">
                      <div className={`font-bold text-sm ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                        {formatDisplayDate(date)}
                      </div>
                      {postsForDay.length > 0 && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                          {postsForDay.length}
                        </span>
                      )}
                    </div>
                    
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                        <span className="ml-2 text-xs text-gray-500">Loading...</span>
                      </div>
                    ) : postsForDay.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs">No posts</span>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {postsForDay.slice(0, 2).map((post, postIndex) => (
                          <div key={postIndex} className="bg-white rounded-lg border border-gray-200 p-2 shadow-sm">
                            <div className="flex items-start space-x-2">
                              {/* Image */}
                              {(() => {
                                const imageUrl = post.media_urls?.[0] || post.image_url || post.media?.[0]?.url || post.attachment_url || post.image;
                                return imageUrl ? (
                                  <img src={imageUrl} alt="Post" className="w-12 h-12 object-cover rounded border flex-shrink-0" onError={(e) => e.target.style.display = 'none'} />
                                ) : null;
                              })()}
                              
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center space-x-1">
                                    {post.platforms?.map((platform, i) => {
                                      const Icon = platformIcons[platform];
                                      const colorClass = platformColors[platform];
                                      return Icon ? (
                                        <div key={i} className="bg-gray-100 rounded-full p-1">
                                          <Icon className={`text-xs ${colorClass}`} />
                                        </div>
                                      ) : null;
                                    })}
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {new Date(post.scheduled_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                  </span>
                                </div>
                                
                                <p className="text-xs text-gray-700 mb-1 line-clamp-2">
                                  {post.content?.substring(0, 40) || 'No content'}
                                  {post.content?.length > 40 ? '...' : ''}
                                </p>
                                
                                {/* Status */}
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  post.status === 'posted' ? 'bg-green-100 text-green-800' :
                                  post.status === 'failed' ? 'bg-red-100 text-red-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {post.status === 'posted' ? '✓ Posted' :
                                   post.status === 'failed' ? '✗ Failed' :
                                   '⏰ Scheduled'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {postsForDay.length > 2 && (
                          <div className="text-center">
                            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-full">
                              +{postsForDay.length - 2} more
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desktop: Grid layout */}
          <div className="hidden md:grid md:grid-cols-7 gap-4 text-center">
            {weekDays.map((date, index) => {
              const postsForDay = getPostsForDate(date);
              const isToday = formatDate(date) === formatDate(new Date());
              
              return (
                <div key={index} className={`p-4 border rounded-xl bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-xl transition-all duration-300 min-h-[220px] ${
                  isToday 
                    ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100 ring-2 ring-blue-200' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className={`font-bold mb-3 text-sm ${
                    isToday ? 'text-blue-700' : 'text-gray-700'
                  }`}>
                    {formatDisplayDate(date)}
                  </div>
                  
                  {loading ? (
                    <div className="flex flex-col items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mb-2"></div>
                      <div className="text-gray-500 text-xs">Loading...</div>
                    </div>
                  ) : postsForDay.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                      <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div className="text-xs font-medium">No posts</div>
                    </div>
                  ) : (
                    <div className="relative h-40 overflow-hidden">
                      <div className="overflow-y-auto h-full space-y-2 pr-2" style={{scrollbarWidth: 'thin'}}>
                        {postsForDay.map((post, postIndex) => {
                          const time = new Date(post.scheduled_time).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            hour12: false 
                          });
                          
                          return (
                            <div key={postIndex} className={`
                              bg-gradient-to-r from-gray-50 to-gray-100 
                              hover:from-gray-100 hover:to-gray-200
                              rounded-lg px-3 py-3 text-xs 
                              border border-gray-200 
                              shadow-sm hover:shadow-md 
                              transition-all duration-200
                              ${post.status === 'failed' ? 'border-red-200 bg-gradient-to-r from-red-50 to-red-100' : ''}
                              ${post.status === 'posted' ? 'border-green-200 bg-gradient-to-r from-green-50 to-green-100' : ''}
                            `}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-1">
                                  {(post.platforms || []).map((platform, i) => {
                                    const Icon = platformIcons[platform];
                                    const colorClass = platformColors[platform];
                                    return Icon ? (
                                      <div key={i} className="bg-white rounded-full p-1 shadow-sm">
                                        <Icon className={`text-sm ${colorClass}`} />
                                      </div>
                                    ) : null;
                                  })}
                                </div>
                                <div className="text-gray-600 text-xs font-semibold bg-white px-2 py-1 rounded-full shadow-sm">
                                  {time}
                                </div>
                              </div>
                              
                              <div className="text-gray-800 text-xs leading-relaxed font-medium bg-white/50 rounded-md p-2 mb-2">
                                {(() => {
                                  const imageUrl = post.media_urls?.[0] || post.image_url || post.media?.[0]?.url || post.attachment_url || post.image;
                                  
                                  if (imageUrl) {
                                    return (
                                      <div className="mb-2">
                                        <img 
                                          src={imageUrl} 
                                          alt="Post media" 
                                          className="w-full h-16 object-cover rounded-md border border-gray-200 shadow-sm"
                                          onError={(e) => {
                                            e.target.style.display = 'none';
                                          }}
                                        />
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                                
                                <div className="text-gray-700">
                                  {post.content?.substring(0, 25) || 'No content'}
                                  {post.content?.length > 25 ? '...' : ''}
                                </div>
                              </div>
                              
                              <div className="flex justify-end">
                                {post.status === 'failed' && (
                                  <div className="flex items-center text-red-600 text-xs font-bold bg-red-100 px-2 py-1 rounded-full">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    Failed
                                  </div>
                                )}
                                {post.status === 'posted' && (
                                  <div className="flex items-center text-green-600 text-xs font-bold bg-green-100 px-2 py-1 rounded-full">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Posted
                                  </div>
                                )}
                                {post.status === 'scheduled' && (
                                  <div className="flex items-center text-blue-600 text-xs font-bold bg-blue-100 px-2 py-1 rounded-full">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                    </svg>
                                    Scheduled
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {postsForDay.length > 1 && (
                        <div className="absolute bottom-1 right-1 bg-gray-800 text-white text-xs px-2 py-1 rounded-full opacity-75">
                          {postsForDay.length} posts
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Cards - Mobile Responsive */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <ActionCard
            title="Connect to Social Media"
            description="Link your accounts to start scheduling and managing posts."
            buttonText="Connect Now"
            color="from-indigo-500 to-purple-500"
            onClick={() => router.push('/home/manage-accounts')}
          />
          <ActionCard
            title="Create New Post"
            description="Start creating and scheduling your social media content."
            buttonText="Create Post"
            color="from-green-400 to-green-600"
            onClick={() => router.push('/home/create-post')}
          />
          <ActionCard
            title="View Analytics"
            description="Track your social media performance and engagement across all platforms."
            buttonText="View Analytics"
            color="from-pink-500 to-purple-600"
            onClick={() => router.push('/home/analytics')}
          />
        </div>

        {/* Draft Card - Full Width */}
        <div className="w-full">
          <ActionCard
            title="Draft Your Idea"
            description="Capture creative ideas and draft your next post strategy."
            buttonText="Draft Now"
            color="from-indigo-400 to-indigo-700"
            onClick={() => router.push('/home/posts-folder')}
          />
        </div>
      </div>
    </div>
  );
}

function ActionCard({ title, description, buttonText, color, onClick }) {
  return (
    <div className={`p-4 md:p-6 rounded-xl shadow-lg bg-gradient-to-r ${color} text-white transition-transform hover:scale-105 duration-200`}>
      <h3 className="text-base md:text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm md:text-base mb-4 leading-relaxed opacity-90">{description}</p>
      <button 
        className="bg-white text-gray-800 px-4 py-2 md:px-6 md:py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors duration-200 text-sm md:text-base w-full md:w-auto min-h-[44px]"
        onClick={onClick}
      >
        {buttonText}
      </button>
    </div>
  );
}
