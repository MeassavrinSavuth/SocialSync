'use client';
import React, { useState, useEffect } from 'react';
import { useProtectedFetch } from '../../hooks/auth/useProtectedFetch';
import { FaCalendarAlt, FaClock, FaFacebook, FaInstagram, FaYoutube, FaTwitter, FaEdit, FaTrash, FaExclamationTriangle } from 'react-icons/fa';
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
  const protectedFetch = useProtectedFetch();

  useEffect(() => {
    fetchScheduledPosts();
  }, []);

  const fetchScheduledPosts = async () => {
    try {
      const response = await protectedFetch('http://localhost:8080/api/scheduled-posts');
      if (response && response.ok) {
        const data = await response.json();
        // Include all posts for the calendar view
        setScheduledPosts(data || []);
      }
    } catch (err) {
      setError('Failed to fetch scheduled posts');
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
      
      if (response && response.ok) {
        // Remove the deleted post from local state
        setScheduledPosts(prev => prev.filter(post => post.id !== postId));
      } else {
        throw new Error('Failed to delete post');
      }
    } catch (err) {
      setError('Failed to delete scheduled post');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getPostsForDate = (date) => {
    const dateStr = formatDate(date);
    return scheduledPosts.filter(post => {
      const postDate = new Date(post.scheduled_time).toISOString().split('T')[0];
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
          className={`h-12 flex items-center justify-center cursor-pointer rounded-lg relative transition-colors
            ${isSelected ? 'bg-blue-600 text-white' : 
              isToday ? 'bg-blue-100 text-blue-600 font-bold' : 
              'hover:bg-gray-100'}
            ${hasPosts ? (hasFailedPosts ? 'ring-2 ring-red-400' : 'ring-2 ring-green-400') : ''}
          `}
        >
          {day}
          {hasPosts && (
            <div className={`absolute bottom-1 right-1 w-2 h-2 rounded-full ${
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
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading scheduled posts...</p>
          </div>
        </div>
      </div>
    );
  }

  const selectedDatePosts = selectedDate ? getPostsForDate(selectedDate) : [];

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Scheduled Posts</h1>
          <p className="text-gray-700 font-medium">View your scheduled posts on the calendar</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ←
              </button>
              <h2 className="text-xl font-bold text-gray-900">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                →
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="h-12 flex items-center justify-center font-bold text-gray-800">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>

            {/* Legend */}
            <div className="mt-6 flex items-center space-x-4 text-sm text-gray-800">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="font-medium">Scheduled posts</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span className="font-medium">Failed posts</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
                <span className="font-medium">Selected date</span>
              </div>
            </div>
          </div>

          {/* Posts for selected date */}
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedDate ? (
                  <>Posts for {selectedDate.toLocaleDateString()}</>
                ) : (
                  'Select a date'
                )}
              </h3>
              {selectedDate && selectedDatePosts.length > 0 && (
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">
                  {selectedDatePosts.length} post{selectedDatePosts.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {selectedDate ? (
              selectedDatePosts.length > 0 ? (
                <div className="space-y-3 overflow-y-auto max-h-96 pr-2">
                  {selectedDatePosts.map((post) => {
                    const scheduleTime = new Date(post.scheduled_time);
                    const isPastDue = scheduleTime < new Date();
                    return (
                      <div key={post.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50">
                        {/* Post status */}
                        <div className="flex items-center justify-between mb-3">
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
                              <FaExclamationTriangle className="text-red-600" title={post.error_message} />
                            )}
                          </div>
                          
                          {/* Action buttons */}
                          {post.status === 'pending' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => deleteScheduledPost(post.id)}
                                disabled={deleteLoading}
                                className="p-1 text-red-600 hover:text-red-800 transition-colors"
                                title="Delete scheduled post"
                              >
                                <FaTrash className="text-sm" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Post content preview */}
                        <p className="text-gray-800 mb-3 line-clamp-3 font-medium">
                          {post.content || 'No content preview'}
                        </p>

                        {/* Media thumbnail */}
                        {post.media_urls && post.media_urls.length > 0 && (
                          <div className="mb-3">
                            <img
                              src={post.media_urls[0]}
                              alt="Post media"
                              className="w-16 h-16 object-cover rounded-lg border"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}

                        {/* Platforms */}
                        <div className="flex space-x-2 mb-3">
                          {post.platforms?.map((platform) => {
                            const Icon = platformIcons[platform];
                            const colorClass = platformColors[platform];
                            return Icon ? (
                              <Icon key={platform} className={`text-lg ${colorClass}`} title={platform} />
                            ) : null;
                          })}
                        </div>

                        {/* Scheduled time */}
                        <div className="flex items-center text-sm text-gray-700 font-medium">
                          <FaClock className="mr-2 text-gray-500" />
                          {scheduleTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-700 text-center py-4 font-medium">No posts scheduled for this date</p>
              )
            ) : (
              <div className="text-center py-8">
                <FaCalendarAlt className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <p className="text-gray-700 font-medium">Click on a calendar date to view scheduled posts</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-2xl font-bold text-blue-700">{scheduledPosts.length}</div>
            <div className="text-gray-700 font-medium">Total Posts</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-2xl font-bold text-orange-700">
              {scheduledPosts.filter(p => p.status === 'pending').length}
            </div>
            <div className="text-gray-700 font-medium">Pending</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-2xl font-bold text-green-700">
              {scheduledPosts.filter(p => p.status === 'posted').length}
            </div>
            <div className="text-gray-700 font-medium">Posted</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-2xl font-bold text-red-700">
              {scheduledPosts.filter(p => p.status === 'failed').length}
            </div>
            <div className="text-gray-700 font-medium">Failed</div>
          </div>
        </div>
      </div>
    </div>
  );
}
