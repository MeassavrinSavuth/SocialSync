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
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showMiniCalendar, setShowMiniCalendar] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostDetails, setShowPostDetails] = useState(false);
  const [miniCalendarMonth, setMiniCalendarMonth] = useState(new Date());
  const [miniCalendarYear, setMiniCalendarYear] = useState(new Date().getFullYear());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [postToEdit, setPostToEdit] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const protectedFetch = useProtectedFetch();
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

  useEffect(() => {
    fetchScheduledPosts();
  }, []);

  const fetchScheduledPosts = async () => {
    try {
      const res = await protectedFetch(`${API_BASE_URL}/api/scheduled-posts`);

      if (!res) throw new Error('No response from server');
      if (!res.ok) {
        const text = await res.text().catch(() => null);
        throw new Error(text || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      setScheduledPosts(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch scheduled posts');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (post) => {
    setPostToDelete(post);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!postToDelete) return;

    setDeleteLoading(true);
    try {
      const res = await protectedFetch(`${API_BASE_URL}/api/scheduled-posts/${postToDelete.id}`, {
        method: 'DELETE',
      });

      if (!res) throw new Error('No response from server');
      if (!res.ok) {
        const text = await res.text().catch(() => null);
        throw new Error(text || `HTTP error ${res.status}`);
      }

      // Remove the deleted post from local state
      setScheduledPosts(prev => prev.filter(post => post.id !== postToDelete.id));
      setShowDeleteModal(false);
      setPostToDelete(null);
    } catch (err) {
      setError(err.message || 'Failed to delete scheduled post');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditClick = (post) => {
    setPostToEdit(post);
    setEditContent(post.content || '');
    setEditDate(new Date(post.scheduled_time).toISOString().split('T')[0]);
    setEditTime(new Date(post.scheduled_time).toTimeString().slice(0, 5));
    setShowEditModal(true);
  };

  const handleReschedule = (post) => {
    // For now, just show the edit modal
    handleEditClick(post);
  };

  const savePostChanges = async () => {
    if (!postToEdit) return;

    if (!editDate || !editTime) {
      setError('Please select both date and time');
      return;
    }

    const newScheduledTime = new Date(`${editDate}T${editTime}`).toISOString();

    try {
      const res = await protectedFetch(`${API_BASE_URL}/api/scheduled-posts/${postToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editContent,
          scheduled_time: newScheduledTime,
          platforms: postToEdit.platforms,
          media_urls: postToEdit.media_urls,
        }),
      });

      if (!res) throw new Error('No response from server');
      if (!res.ok) {
        const text = await res.text().catch(() => null);
        throw new Error(text || `HTTP error ${res.status}`);
      }

      // Update the post in local state
      setScheduledPosts(prev => prev.map(post => 
        post.id === postToEdit.id 
          ? { ...post, content: editContent, scheduled_time: newScheduledTime }
          : post
      ));

      setShowEditModal(false);
      setPostToEdit(null);
      setEditContent('');
      setEditDate('');
      setEditTime('');
    } catch (err) {
      setError(err.message || 'Failed to update scheduled post');
    }
  };

  // Week view helper functions
  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const getWeekDays = () => {
    const start = getWeekStart(currentWeek);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getWeekRange = () => {
    const days = getWeekDays();
    const start = days[0];
    const end = days[6];
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const getWeekRangeForDate = (date) => {
    const start = getWeekStart(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  // Mini calendar functions
  const getMiniCalendarWeeks = () => {
    const weeks = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (today.getDay() + 42)); // 6 weeks back
    
    for (let i = 0; i < 12; i++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(startDate.getDate() + (i * 7));
      weeks.push(weekStart);
    }
    return weeks;
  };

  const handlePostClick = (post) => {
    setSelectedPost(post);
    setShowPostDetails(true);
  };

  const closePostDetails = () => {
    setShowPostDetails(false);
    setSelectedPost(null);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setPostToEdit(null);
    setEditContent('');
    setEditDate('');
    setEditTime('');
  };

  // Mini calendar helper functions
  const getMiniCalendarDays = () => {
    const year = miniCalendarYear;
    const month = miniCalendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getPostsCountForDate = (date) => {
    return getPostsForDate(date).length;
  };

  const getTotalScheduledPosts = () => {
    return scheduledPosts.filter(post => post.status === 'pending').length;
  };

  const getTotalFailedPosts = () => {
    return scheduledPosts.filter(post => post.status === 'failed').length;
  };

  const getTotalPostedPosts = () => {
    return scheduledPosts.filter(post => post.status === 'posted').length;
  };

  const getPostsForDate = (date) => {
    const dateStr = formatDate(date);
    return scheduledPosts.filter(post => {
      const postDate = new Date(post.scheduled_time).toISOString().split('T')[0];
      return postDate === dateStr && post.status !== 'cancelled';
    });
  };

  const getPostsForTimeSlot = (date, hour) => {
    const posts = getPostsForDate(date);
    return posts.filter(post => {
      const postHour = new Date(post.scheduled_time).getHours();
      return postHour === hour;
    });
  };

  // Navigate weeks
  const goToPreviousWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() - 7);
    setCurrentWeek(newWeek);
  };

  const goToNextWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + 7);
    setCurrentWeek(newWeek);
  };

  // Render time slots (12 AM to 11 PM - Full 24 hours)
  const renderTimeSlots = () => {
    const timeSlots = [];
    for (let hour = 0; hour <= 23; hour++) {
      timeSlots.push(
        <div key={hour} className="h-16 border-b border-gray-200 flex items-center justify-end pr-2">
          <span className="text-sm text-gray-500 font-medium">
            {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
          </span>
        </div>
      );
    }
    return timeSlots;
  };

  // Render week days with time slots
  const renderWeekDays = () => {
    const days = getWeekDays();
    const today = new Date();

    return days.map((day, dayIndex) => {
      const isToday = formatDate(day) === formatDate(today);
      const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNumber = day.getDate();
      
      return (
        <div key={dayIndex} className="flex flex-col border-r border-gray-300">
          {/* Day header */}
          <div className={`h-16 flex flex-col items-center justify-center border-b-2 font-bold ${
            isToday ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-800'
          }`}>
            <div className="text-sm">{dayName}</div>
            <div className="text-lg">{dayNumber}</div>
          </div>
          
          {/* Time slots for this day - Full 24 hours */}
          {Array.from({ length: 24 }, (_, hourIndex) => {
            const hour = hourIndex; // 0 AM to 11 PM (24 hours)
            const postsInSlot = getPostsForTimeSlot(day, hour);
            
            return (
              <div key={hourIndex} className="h-16 border-b border-gray-200 relative hover:bg-gray-50 pointer-events-none">
                {postsInSlot.map((post, postIndex) => {
                  const postTime = new Date(post.scheduled_time);
                  const minutes = postTime.getMinutes();
                  const topOffset = (minutes / 60) * 64; // 64px = h-16
                  
                  return (
                    <div
                      key={postIndex}
                      className={`absolute left-1 right-1 rounded-md p-1 text-xs cursor-pointer transition-all duration-200 hover:shadow-md pointer-events-auto ${
                        post.status === 'failed' ? 'bg-red-100 border-red-300 text-red-800' :
                        post.status === 'posted' ? 'bg-green-100 border-green-300 text-green-800' :
                        'bg-blue-100 border-blue-300 text-blue-800'
                      }`}
                      style={{ top: `${topOffset}px`, height: '60px' }}
                      onClick={() => handlePostClick(post)}
                    >
                      <div className="font-medium truncate">{post.content?.substring(0, 30)}...</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs opacity-75">{formatTime(postTime)}</span>
                        <div className="flex space-x-1">
                          {post.platforms?.slice(0, 2).map((platform) => {
                            const Icon = platformIcons[platform];
                            const colorClass = platformColors[platform];
                            return Icon ? (
                              <Icon key={platform} className={`text-xs ${colorClass}`} />
                            ) : null;
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      );
    });
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


  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-3 min-w-0">
              <button
                className="p-2 bg-blue-600 text-white rounded-md sm:hidden"
                aria-label="open-nav"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
              </button>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 truncate">Scheduled Posts</h1>
                <p className="text-gray-700 text-sm sm:text-base font-medium truncate">View your scheduled posts on the calendar</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

  {/* Full-width Week View Calendar */}
  <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 w-full">
            {/* Calendar Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={goToPreviousWeek}
                className="p-3 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-all duration-200 font-bold text-xl hover:shadow-md"
              >
                ←
              </button>
              <h2 className="text-3xl font-bold text-gray-900">
                {getWeekRange()}
              </h2>
              <button
                onClick={goToNextWeek}
                className="p-3 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-all duration-200 font-bold text-xl hover:shadow-md"
              >
                →
              </button>
            </div>

            <div className="flex items-center space-x-4">
              {/* Post Counters - Only Scheduled */}
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600">Scheduled: <span className="font-semibold text-blue-600">{getTotalScheduledPosts()}</span></span>
                </div>
              </div>

              {/* Mini Calendar Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowMiniCalendar(!showMiniCalendar)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center space-x-2"
                >
                  <span>📅</span>
                  <span>Select Week</span>
                  <span>▼</span>
                </button>
                
                {showMiniCalendar && (
                  <div className="absolute top-full right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-xl z-50 w-96">
                    <div className="flex">
            {/* Calendar Grid */}
                      <div className="flex-1 p-4">
                        {/* Month/Year Header */}
                        <div className="flex items-center justify-between mb-4">
                          <button
                            onClick={() => {
                              const newMonth = new Date(miniCalendarMonth);
                              newMonth.setMonth(newMonth.getMonth() - 1);
                              setMiniCalendarMonth(newMonth);
                            }}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            ←
                          </button>
                          <h3 className="font-semibold text-gray-900">
                            {miniCalendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </h3>
                          <button
                            onClick={() => {
                              const newMonth = new Date(miniCalendarMonth);
                              newMonth.setMonth(newMonth.getMonth() + 1);
                              setMiniCalendarMonth(newMonth);
                            }}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            →
                          </button>
                        </div>

                        {/* Days of week */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                            <div key={`day-${index}`} className="h-8 flex items-center justify-center text-xs font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>

                        {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
                          {getMiniCalendarDays().map((date, index) => {
                            const isCurrentMonth = date.getMonth() === miniCalendarMonth.getMonth();
                            const isToday = formatDate(date) === formatDate(new Date());
                            const postsCount = getPostsCountForDate(date);
                            const isSelectedWeek = getWeekStart(date).getTime() === getWeekStart(currentWeek).getTime();
                            
                            return (
                              <button
                                key={index}
                                onClick={() => {
                                  setCurrentWeek(getWeekStart(date));
                                  setShowMiniCalendar(false);
                                }}
                                className={`h-8 w-8 flex items-center justify-center text-xs rounded relative ${
                                  isSelectedWeek 
                                    ? 'bg-blue-600 text-white' 
                                    : isToday 
                                    ? 'bg-blue-100 text-blue-600 font-semibold' 
                                    : isCurrentMonth 
                                    ? 'text-gray-900 hover:bg-gray-100' 
                                    : 'text-gray-400'
                                }`}
                              >
                                {date.getDate()}
                                {postsCount > 0 && (
                                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Month/Year Selector */}
                      <div className="w-32 p-4 bg-gray-50 border-l border-gray-200">
                        {/* Year */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <button
                              onClick={() => setMiniCalendarYear(miniCalendarYear - 1)}
                              className="p-1 hover:bg-gray-200 rounded text-xs"
                            >
                              ↑
                            </button>
                            <span className="font-semibold text-gray-900">{miniCalendarYear}</span>
                            <button
                              onClick={() => setMiniCalendarYear(miniCalendarYear + 1)}
                              className="p-1 hover:bg-gray-200 rounded text-xs"
                            >
                              ↓
                            </button>
                          </div>
                        </div>

                        {/* Months */}
                        <div className="grid grid-cols-2 gap-1">
                          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => (
                            <button
                              key={month}
                              onClick={() => {
                                const newMonth = new Date(miniCalendarYear, index);
                                setMiniCalendarMonth(newMonth);
                              }}
                              className={`p-2 text-xs rounded hover:bg-gray-200 ${
                                index === miniCalendarMonth.getMonth() 
                                  ? 'bg-blue-600 text-white' 
                                  : 'text-gray-700'
                              }`}
                            >
                              {month}
                            </button>
                          ))}
            </div>

                        {/* Today button */}
                        <button
                          onClick={() => {
                            const today = new Date();
                            setCurrentWeek(today);
                            setMiniCalendarMonth(today);
                            setMiniCalendarYear(today.getFullYear());
                            setShowMiniCalendar(false);
                          }}
                          className="w-full mt-4 px-3 py-2 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                        >
                          Today
                        </button>
                      </div>
              </div>
              </div>
                )}
              </div>
              
              {/* Today button */}
              <button
                onClick={() => setCurrentWeek(new Date())}
                className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                  formatDate(getWeekStart(currentWeek)) === formatDate(getWeekStart(new Date()))
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Today
              </button>
            </div>
          </div>

          {/* Week View with Time Slots - Full Width */}
          {/* On small screens show a stacked list for easier scrolling and touch targets. On sm+ show full grid. */}
          <div className="w-full">
            {/* Mobile stacked view */}
            <div className="sm:hidden">
              <div className="space-y-4">
                {getWeekDays().map((day, di) => (
                  <div key={`mobile-day-${di}`} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-sm text-gray-500">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        <div className="text-lg font-semibold">{day.getDate()}</div>
                      </div>
                      <div className="text-sm text-gray-600">{getWeekRangeForDate(day)}</div>
                    </div>
                    <div className="space-y-2">
                      {getPostsForDate(day).length === 0 && (
                        <div className="text-sm text-gray-500">No posts scheduled</div>
                      )}
                      {getPostsForDate(day).map((post) => (
                        <button
                          key={post.id}
                          onClick={() => handlePostClick(post)}
                          className="w-full text-left bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex items-center justify-between space-x-3 hover:shadow-md"
                        >
                          <div className="flex-1">
                            <div className="font-medium truncate">{post.content?.substring(0, 80)}</div>
                            <div className="text-xs text-gray-500 mt-1">{formatTime(new Date(post.scheduled_time))}</div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {post.platforms?.slice(0,2).map((p) => {
                              const Icon = platformIcons[p];
                              const colorClass = platformColors[p];
                              return Icon ? <Icon key={p} className={`text-lg ${colorClass}`} /> : null;
                            })}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop / Tablet full grid - horizontally scrollable on narrow screens */}
            <div className="hidden sm:block overflow-x-auto">
              <div className="min-w-[900px] grid grid-cols-8 gap-0">
                {/* Time column */}
                <div className="w-24 border-r-2 border-gray-300">
                  <div className="h-16 border-b-2 border-gray-300"></div>
                  {renderTimeSlots()}
                </div>

                {/* Days of the week */}
                {renderWeekDays()}
              </div>
            </div>
          </div>
                          </div>
                          
        {/* Post Details Modal */}
        {showPostDetails && selectedPost && (
          <div className="fixed inset-0 z-50 p-4 flex items-end sm:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}>
            <div className="bg-white w-full sm:max-w-2xl rounded-t-xl sm:rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Post Details</h3>
                              <button
                    onClick={closePostDetails}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                              </button>
                            </div>

                {/* Post Content */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Content</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-800 whitespace-pre-wrap">{selectedPost.content || 'No content'}</p>
                  </div>
                </div>

                {/* Post Status */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Status</h4>
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      selectedPost.status === 'posted' ? 'bg-green-100 text-green-800' :
                      selectedPost.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {selectedPost.status === 'posted' ? 'Posted' :
                       selectedPost.status === 'failed' ? 'Failed' : 'Scheduled'}
                    </span>
                    {selectedPost.status === 'failed' && selectedPost.error_message && (
                      <span className="text-red-600 text-sm">
                        <FaExclamationTriangle className="inline mr-1" />
                        {selectedPost.error_message}
                      </span>
                    )}
                  </div>
                </div>

                {/* Platforms */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Platforms</h4>
                  <div className="flex space-x-3">
                    {selectedPost.platforms?.map((platform) => {
                      const Icon = platformIcons[platform];
                      const colorClass = platformColors[platform];
                      return Icon ? (
                        <div key={platform} className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg">
                          <Icon className={`text-xl ${colorClass}`} />
                          <span className="font-medium capitalize">{platform}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                        </div>

                {/* Scheduled Time */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Scheduled Time</h4>
                  <div className="flex items-center space-x-2 text-gray-700">
                    <FaClock className="text-gray-500" />
                    <span className="font-medium">
                      {new Date(selectedPost.scheduled_time).toLocaleString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                {/* Media */}
                {selectedPost.media_urls && selectedPost.media_urls.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-800 mb-3">Media ({selectedPost.media_urls.length})</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedPost.media_urls.map((url, index) => (
                        <div key={index} className="relative">
                          <img
                            src={url}
                            alt={`Media ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                      ))}
                        </div>
                      </div>
                )}

                {/* Actions */}
                {selectedPost.status === 'pending' && (
                  <div className="flex justify-between pt-4 border-t border-gray-200">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          handleEditClick(selectedPost);
                          closePostDetails();
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Edit Content
                      </button>
                      <button
                        onClick={() => {
                          handleReschedule(selectedPost);
                          closePostDetails();
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Reschedule
                      </button>
                </div>
                    <button
                      onClick={() => {
                        handleDeleteClick(selectedPost);
                        closePostDetails();
                      }}
                      disabled={deleteLoading}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {deleteLoading ? 'Deleting...' : 'Delete Post'}
                    </button>
              </div>
            )}
          </div>
        </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && postToDelete && (
          <div className="fixed inset-0 z-50 p-4 flex items-end sm:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
            <div className="bg-white w-full sm:max-w-md rounded-t-xl sm:rounded-xl shadow-2xl overflow-hidden">
              <div className="p-4 sm:p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Delete Scheduled Post</h3>
                    <p className="text-sm text-gray-600">This action cannot be undone</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <p className="text-gray-700 mb-3">Are you sure you want to delete this scheduled post?</p>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-800 font-medium truncate">
                      {postToDelete.content?.substring(0, 100)}...
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Scheduled for: {new Date(postToDelete.scheduled_time).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setPostToDelete(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleteLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleteLoading ? 'Deleting...' : 'Delete Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit/Reschedule Modal */}
        {showEditModal && postToEdit && (
          <div className="fixed inset-0 z-50 p-4 flex items-end sm:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}>
            <div className="bg-white w-full sm:max-w-2xl rounded-t-xl sm:rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Edit Scheduled Post</h3>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setPostToEdit(null);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Content Edit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Post Content
                    </label>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={4}
                      placeholder="Enter your post content..."
                    />
                  </div>

                  {/* Reschedule */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reschedule Date & Time
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <input
                          type="time"
                          value={editTime}
                          onChange={(e) => setEditTime(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Platforms */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Platforms
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {postToEdit.platforms?.map((platform) => {
                        const Icon = platformIcons[platform];
                        const colorClass = platformColors[platform];
                        return (
                          <div key={platform} className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg">
                            {Icon && <Icon className={`text-lg ${colorClass}`} />}
                            <span className="font-medium capitalize">{platform}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Media Preview */}
                  {postToEdit.media_urls && postToEdit.media_urls.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Media Files ({postToEdit.media_urls.length})
                      </label>
                      <div className="grid grid-cols-3 gap-4">
                        {postToEdit.media_urls.map((url, index) => (
                          <div key={index} className="relative">
                            <img
                              src={url}
                              alt={`Media ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border"
                            />
                            <button className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600">
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={closeEditModal}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={savePostChanges}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
            </div>
          </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}