'use client';
import React, { useState, useEffect } from 'react';
import { useProtectedFetch } from '../../hooks/auth/useProtectedFetch';
import AuthErrorModal from '../../components/AuthErrorModal';
import { FaCalendarAlt, FaClock, FaFacebook, FaInstagram, FaYoutube, FaTwitter, FaEdit, FaTrash, FaExclamationTriangle, FaPlug } from 'react-icons/fa';
import { SiMastodon } from 'react-icons/si';

// Platform icons mapping
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

export default function ScheduledPostsPage() {
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [authErrors, setAuthErrors] = useState([]);
  const [showAuthErrorModal, setShowAuthErrorModal] = useState(false);
  const protectedFetch = useProtectedFetch();

  useEffect(() => {
    fetchScheduledPosts();
  }, []);

  const fetchScheduledPosts = async () => {
    try {
      const response = await protectedFetch('http://localhost:8080/api/scheduled-posts');
      
      if (!response || !response.ok) {
        throw new Error('Failed to fetch scheduled posts');
      }

      const data = await response.json();
      setScheduledPosts(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch scheduled posts');
    } finally {
      setLoading(false);
    }
  };

  const deleteScheduledPost = async (postId) => {
    if (!confirm('Are you sure you want to delete this scheduled post?')) {
      return;
    }

    setDeleteLoading(true);
    try {
      const response = await protectedFetch(`http://localhost:8080/api/scheduled-posts/${postId}`, {
        method: 'DELETE',
      });
      
      if (!response || !response.ok) {
        throw new Error('Failed to delete post');
      }

      // Remove the deleted post from local state
      setScheduledPosts(prev => prev.filter(post => post.id !== postId));
    } catch (err) {
      setError(err.message || 'Failed to delete scheduled post');
    } finally {
      setDeleteLoading(false);
    }
  };

  const checkForAuthErrors = () => {
    // Look for failed posts with authentication-related error messages
    const authFailedPosts = scheduledPosts.filter(post => 
      post.status === 'failed' && 
      post.error_message &&
      (post.error_message.includes('please reconnect') || 
       post.error_message.includes('access token expired') ||
       post.error_message.includes('refresh failed'))
    );

    if (authFailedPosts.length > 0) {
      // Extract unique platforms that need reconnection
      const platformsNeedingReconnect = [...new Set(
        authFailedPosts.map(post => {
          // Extract platform from error message or from platforms array
          if (post.error_message.includes('YouTube')) return 'youtube';
          if (post.error_message.includes('Facebook')) return 'facebook';
          if (post.error_message.includes('Instagram')) return 'instagram';
          if (post.error_message.includes('Twitter')) return 'twitter';
          if (post.error_message.includes('Mastodon')) return 'mastodon';
          // Fallback: check the first platform from the post's platforms array
          return post.platforms?.[0] || 'unknown';
        }).filter(platform => platform !== 'unknown')
      )];

      const authErrors = platformsNeedingReconnect.map(platform => ({
        platform,
        success: false,
        error: 'Authentication expired',
        errorType: 'AUTH_EXPIRED',
        errorAction: 'RECONNECT_REQUIRED',
        userFriendlyMessage: 'Your authentication has expired. Please reconnect to continue posting.'
      }));

      setAuthErrors(authErrors);
      setShowAuthErrorModal(true);
    }
  };

  const handleReconnect = () => {
    setShowAuthErrorModal(false);
    setAuthErrors([]);
  };

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // return local YYYY-MM-DD (avoid toISOString which uses UTC and can shift the day)
  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getPostsForDate = (date) => {
    const dateStr = formatDate(date);
    return scheduledPosts.filter(post => {
      // Use local date string for the post's scheduled time to match the calendar's local dates
      const postDate = formatDate(new Date(post.scheduled_time));
      return postDate === dateStr;
    });
  };

  const hasPostsOnDate = (date) => {
    return getPostsForDate(date).length > 0;
  };

  const hasFailedPostsOnDate = (date) => {
    const posts = getPostsForDate(date);
    return posts.some(post => post.status === 'failed');
  };

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    setSelectedDate(null);
  };

  // Render calendar
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];
    const today = new Date();

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-12"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isToday = formatDate(date) === formatDate(today);
      const hasPosts = hasPostsOnDate(date);
      const hasFailedPosts = hasFailedPostsOnDate(date);
      const isSelected = selectedDate && formatDate(date) === formatDate(selectedDate);

      days.push(
        <div
          key={day}
          onClick={() => setSelectedDate(date)}
          className={`h-10 md:h-12 lg:h-14 flex items-center justify-center cursor-pointer rounded-lg relative transition-colors text-sm md:text-base font-medium min-h-[40px]
            ${isSelected ? 'bg-blue-600 text-white' : 
              isToday ? 'bg-blue-100 text-blue-600 font-bold' : 
              'text-gray-800 hover:bg-gray-100 active:bg-gray-200'}
            ${hasPosts ? (hasFailedPosts ? 'ring-1 md:ring-2 ring-red-400' : 'ring-1 md:ring-2 ring-green-400') : ''}
          `}
        >
          {day}
          {hasPosts && (
            <div className={`absolute bottom-0.5 md:bottom-1 right-0.5 md:right-1 w-1.5 md:w-2 h-1.5 md:h-2 rounded-full ${
              hasFailedPosts ? 'bg-red-500' : 'bg-green-500'
            }`}></div>
          )}
        </div>
      );
    }

    return days;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-4 md:py-6 lg:py-10 px-2 sm:px-4 lg:px-6 xl:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12 md:py-20">
            <div className="animate-spin rounded-full h-8 md:h-12 w-8 md:w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-3 md:mt-4 text-gray-600 text-sm md:text-base">Loading scheduled posts...</p>
          </div>
        </div>
      </div>
    );
  }

  const selectedDatePosts = selectedDate ? getPostsForDate(selectedDate) : [];

  return (
    <div className="min-h-screen bg-gray-50 py-3 md:py-6 lg:py-10 px-2 sm:px-4 lg:px-6 xl:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header - Mobile Optimized */}
        <div className="mb-4 md:mb-6 lg:mb-8">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 md:mb-2">Scheduled Posts</h1>
          <p className="text-gray-700 font-medium text-sm md:text-base">View your scheduled posts on the calendar</p>
        </div>

        {error && (
          <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm md:text-base">{error}</p>
          </div>
        )}

        {/* Responsive Layout: Stacked on mobile, side-by-side on larger screens */}
        <div className="flex flex-col xl:grid xl:grid-cols-12 gap-4 md:gap-6">
          {/* Calendar Section */}
          <div className="xl:col-span-8 bg-white rounded-lg shadow-md p-3 md:p-4 lg:p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <button
                onClick={goToPreviousMonth}
                className="p-1.5 md:p-2 rounded-lg transition-colors text-gray-600 hover:text-gray-800 hover:bg-gray-100 text-lg md:text-xl"
                aria-label="Previous month"
              >
                ←
              </button>
              <h2 className="text-lg md:text-xl lg:text-2xl font-extrabold text-gray-900 text-center">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <button
                onClick={goToNextMonth}
                className="p-1.5 md:p-2 rounded-lg transition-colors text-gray-600 hover:text-gray-800 hover:bg-gray-100 text-lg md:text-xl"
                aria-label="Next month"
              >
                →
              </button>
            </div>

            {/* Calendar Grid - Mobile Optimized */}
            <div className="grid grid-cols-7 gap-0.5 md:gap-1 mb-2 md:mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="h-8 md:h-12 flex items-center justify-center font-bold text-gray-900 text-xs md:text-sm">
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.slice(0, 1)}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5 md:gap-1">
              {renderCalendar()}
            </div>

            {/* Legend - Mobile Responsive */}
            <div className="mt-4 md:mt-6 flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0 text-xs md:text-sm text-gray-800">
              <div className="flex items-center">
                <div className="w-2.5 md:w-3 h-2.5 md:h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="font-medium">Scheduled posts</span>
              </div>
              <div className="flex items-center">
                <div className="w-2.5 md:w-3 h-2.5 md:h-3 bg-red-500 rounded-full mr-2"></div>
                <span className="font-medium">Failed posts</span>
              </div>
              <div className="flex items-center">
                <div className="w-2.5 md:w-3 h-2.5 md:h-3 bg-blue-600 rounded-full mr-2"></div>
                <span className="font-medium">Selected date</span>
              </div>
            </div>
          </div>

          {/* Posts for selected date - Mobile Optimized */}
          <div className="xl:col-span-4 bg-white rounded-lg shadow-md p-3 md:p-4 lg:p-6 flex flex-col max-h-[500px] xl:max-h-[600px]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 md:mb-4 space-y-2 sm:space-y-0">
              <h3 className="text-base md:text-lg lg:text-xl font-bold text-gray-900">
                {selectedDate ? (
                  <>Posts for {selectedDate.toLocaleDateString()}</>
                ) : (
                  'Select a date'
                )}
              </h3>
              {selectedDate && selectedDatePosts.length > 0 && (
                <span className="bg-blue-100 text-blue-800 text-xs md:text-sm font-medium px-2 py-1 rounded-full">
                  {selectedDatePosts.length} post{selectedDatePosts.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {selectedDate ? (
              selectedDatePosts.length > 0 ? (
                <div className="space-y-2 md:space-y-3 overflow-y-auto flex-1 pr-1 md:pr-2">
                  {selectedDatePosts.map((post) => {
                    const scheduleTime = new Date(post.scheduled_time);
                    const isPastDue = scheduleTime < new Date();
                    return (
                      <div key={post.id} className="border border-gray-200 rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow bg-gray-50">
                        {/* Post status - Mobile Optimized */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 md:mb-3 space-y-2 sm:space-y-0">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              post.status === 'posted' ? 'bg-green-100 text-green-800' :
                              post.status === 'failed' ? 'bg-red-100 text-red-800' :
                              isPastDue ? 'bg-orange-100 text-orange-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {post.status === 'posted' ? 'Posted' :
                               post.status === 'failed' ? 'Failed' :
                               isPastDue ? 'Past Due' : 'Scheduled'}
                            </span>
                            {post.status === 'failed' && (
                              <div className="flex items-center space-x-2">
                                <FaExclamationTriangle className="text-red-600 text-sm" title={post.error_message} />
                                {post.error_message && 
                                 (post.error_message.includes('please reconnect') || 
                                  post.error_message.includes('access token expired') ||
                                  post.error_message.includes('refresh failed')) && (
                                  <button
                                    onClick={checkForAuthErrors}
                                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                                  >
                                    Fix Connection
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Action buttons - Mobile optimized */}
                          {post.status === 'pending' && (
                            <div className="flex space-x-1 md:space-x-2">
                              <button
                                onClick={() => deleteScheduledPost(post.id)}
                                disabled={deleteLoading}
                                className="p-1.5 md:p-2 text-red-600 hover:text-red-800 transition-colors hover:bg-red-50 rounded"
                                title="Delete scheduled post"
                              >
                                <FaTrash className="text-xs md:text-sm" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Post content preview - Mobile optimized */}
                        <p className="text-gray-800 mb-2 md:mb-3 text-sm md:text-base line-clamp-3 font-medium break-words">
                          {post.content || 'No content preview'}
                        </p>

                        {/* Media thumbnail - Mobile optimized */}
                        {post.media_urls && post.media_urls.length > 0 && (
                          <div className="mb-2 md:mb-3">
                            {(post.media_urls[0].includes('/video/') || 
                              post.media_urls[0].match(/\.(mp4|mov|avi|webm|mkv)(\?|$)/i)) ? (
                              <video
                                src={post.media_urls[0]}
                                className="w-12 h-12 md:w-16 md:h-16 object-cover rounded-lg border"
                                muted
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <img
                                src={post.media_urls[0]}
                                alt="Post media"
                                className="w-12 h-12 md:w-16 md:h-16 object-cover rounded-lg border"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            )}
                          </div>
                        )}

                        {/* Platforms - Mobile friendly */}
                        <div className="flex flex-wrap gap-1 md:gap-2 mb-2 md:mb-3">
                          {post.platforms?.map((platform) => {
                            const Icon = platformIcons[platform];
                            const colorClass = platformColors[platform];
                            return Icon ? (
                              <div key={platform} className="flex items-center space-x-1 bg-gray-100 rounded-full px-2 py-1">
                                <Icon className={`text-sm md:text-lg ${colorClass}`} title={platform} />
                                <span className="text-xs font-medium text-gray-700 capitalize">{platform}</span>
                              </div>
                            ) : null;
                          })}
                        </div>

                        {/* Scheduled time - Mobile optimized */}
                        <div className="flex items-center text-xs md:text-sm text-gray-700 font-medium">
                          <FaClock className="mr-1 md:mr-2 text-gray-500" />
                          {scheduleTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 md:py-8">
                  <p className="text-gray-700 font-medium text-sm md:text-base">No posts scheduled for this date</p>
                </div>
              )
            ) : (
              <div className="text-center py-6 md:py-8">
                <FaCalendarAlt className="mx-auto h-8 md:h-12 w-8 md:w-12 text-gray-400 mb-2 md:mb-3" />
                <p className="text-gray-700 font-medium text-sm md:text-base">Click on a calendar date to view scheduled posts</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick stats - Mobile Grid */}
        <div className="mt-6 md:mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white rounded-lg shadow-md p-3 md:p-6 text-center">
            <div className="text-xl md:text-2xl font-bold text-blue-700">{scheduledPosts.length}</div>
            <div className="text-gray-700 font-medium text-xs md:text-sm">Total Posts</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-3 md:p-6 text-center">
            <div className="text-xl md:text-2xl font-bold text-orange-700">
              {scheduledPosts.filter(p => p.status === 'pending').length}
            </div>
            <div className="text-gray-700 font-medium text-xs md:text-sm">Pending</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-3 md:p-6 text-center">
            <div className="text-xl md:text-2xl font-bold text-green-700">
              {scheduledPosts.filter(p => p.status === 'posted').length}
            </div>
            <div className="text-gray-700 font-medium text-xs md:text-sm">Posted</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-3 md:p-6 text-center">
            <div className="text-xl md:text-2xl font-bold text-red-700">
              {scheduledPosts.filter(p => p.status === 'failed').length}
            </div>
            <div className="text-gray-700 font-medium text-xs md:text-sm">Failed</div>
          </div>
        </div>
      </div>

      {/* Authentication Error Modal */}
      <AuthErrorModal
        isOpen={showAuthErrorModal}
        onClose={() => {
          setShowAuthErrorModal(false);
          setAuthErrors([]);
        }}
        errors={authErrors}
        onReconnect={handleReconnect}
      />
    </div>
  );
}