'use client';
import React, { useState, useEffect } from 'react';
import { useProtectedFetch } from '../../hooks/auth/useProtectedFetch';
import { useSocialAccounts } from '../../hooks/api/useSocialAccounts';
import { FaCalendarAlt, FaClock, FaFacebook, FaInstagram, FaYoutube, FaTwitter, FaEdit, FaTrash, FaExclamationTriangle, FaTelegramPlane } from 'react-icons/fa';
import { SiMastodon } from 'react-icons/si';

// Platform icons mapping
const platformIcons = {
  facebook: FaFacebook,
  instagram: FaInstagram,
  youtube: FaYoutube,
  twitter: FaTwitter,
  mastodon: SiMastodon,
  telegram: FaTelegramPlane,
};

const platformColors = {
  facebook: 'text-blue-600',
  instagram: 'text-pink-500',
  youtube: 'text-red-600',
  twitter: 'text-sky-500',
  mastodon: 'text-purple-600',
  telegram: 'text-blue-500',
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
  const { getAccountName, getAccountInfo } = useSocialAccounts();

  useEffect(() => {
    fetchScheduledPosts();
  }, []);

  const fetchScheduledPosts = async () => {
    try {
      const data = await protectedFetch('/scheduled-posts');

      if (!data) {
        throw new Error('No response from server');
      }

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
      const result = await protectedFetch(`/scheduled-posts/${postToDelete.id}`, {
        method: 'DELETE',
      });

      if (!result) {
        throw new Error('No response from server');
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
    // Use local date formatting to avoid timezone issues
    const postDate = new Date(post.scheduled_time);
    setEditDate(postDate.getFullYear() + '-' + 
                String(postDate.getMonth() + 1).padStart(2, '0') + '-' + 
                String(postDate.getDate()).padStart(2, '0'));
    // Use local time formatting to avoid timezone issues
    const postTime = new Date(post.scheduled_time);
    setEditTime(String(postTime.getHours()).padStart(2, '0') + ':' + 
                String(postTime.getMinutes()).padStart(2, '0'));
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

    // Create date in local timezone to avoid timezone conversion issues
    const newScheduledTime = new Date(`${editDate}T${editTime}:00`);

    try {
      const res = await protectedFetch(`/scheduled-posts/${postToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editContent,
          scheduled_time: newScheduledTime,
          platforms: postToEdit.platforms,
          media_urls: postToEdit.media_urls,
        }),
      });

      if (!res) {
        throw new Error('No response from server');
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
    // Use local date formatting to avoid timezone issues
    return date.getFullYear() + '-' + 
           String(date.getMonth() + 1).padStart(2, '0') + '-' + 
           String(date.getDate()).padStart(2, '0');
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
      // Use local date formatting to avoid timezone issues
      const postDateObj = new Date(post.scheduled_time);
      const postDate = postDateObj.getFullYear() + '-' + 
                      String(postDateObj.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(postDateObj.getDate()).padStart(2, '0');
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
          <div className="flex items-center justify-between flex-wrap mb-6">
            <div className="flex items-center space-x-3 min-w-0">
              <button
                onClick={goToPreviousWeek}
                className="hidden sm:inline-flex p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-all duration-150"
                aria-label="previous-week"
              >
                ←
              </button>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-3xl font-bold text-gray-900 truncate">{getWeekRange()}</h2>
              </div>
              <button
                onClick={goToNextWeek}
                className="hidden sm:inline-flex p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-all duration-150"
                aria-label="next-week"
              >
                →
              </button>
            </div>

            <div className="flex items-center space-x-3 mt-3 sm:mt-0">
              {/* Post Counters - Only Scheduled */}
              <div className="flex items-center space-x-3 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600">Scheduled: <span className="font-semibold text-blue-600">{getTotalScheduledPosts()}</span></span>
                </div>
              </div>

              {/* Mini Calendar Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowMiniCalendar(!showMiniCalendar)}
                  className="px-2 py-1 sm:px-4 sm:py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center space-x-2"
                >
                  <span>📅</span>
                  <span className="hidden sm:inline">Select Week</span>
                  <span className="ml-1">▼</span>
                </button>
                
                {showMiniCalendar && (
                  <div className="fixed left-1/2 top-1/4 z-50 -translate-x-1/2 w-[90vw] sm:top-full sm:left-auto sm:translate-x-0 sm:relative sm:w-auto" style={{ maxWidth: '720px' }}>
                    <div className="bg-white border border-gray-300 rounded-lg shadow-xl w-full overflow-hidden">
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
                              <div key={`day-${index}`} className="h-8 flex items-center justify-center text-xs font-medium text-gray-500">{day}</div>
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
                                    isSelectedWeek ? 'bg-blue-600 text-white' : isToday ? 'bg-blue-100 text-blue-600 font-semibold' : isCurrentMonth ? 'text-gray-900 hover:bg-gray-100' : 'text-gray-400'
                                  }`}
                                >
                                  {date.getDate()}
                                  {postsCount > 0 && <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>}
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
                              <button onClick={() => setMiniCalendarYear(miniCalendarYear - 1)} className="p-1 hover:bg-gray-200 rounded text-xs">↑</button>
                              <span className="font-semibold text-gray-900">{miniCalendarYear}</span>
                              <button onClick={() => setMiniCalendarYear(miniCalendarYear + 1)} className="p-1 hover:bg-gray-200 rounded text-xs">↓</button>
                            </div>
                          </div>

                          {/* Months */}
                          <div className="grid grid-cols-2 gap-1">
                            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((month, index) => (
                              <button key={month} onClick={() => { const newMonth = new Date(miniCalendarYear, index); setMiniCalendarMonth(newMonth); }} className={`p-2 text-xs rounded hover:bg-gray-200 ${index === miniCalendarMonth.getMonth() ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                                {month}
                              </button>
                            ))}
                          </div>

                          {/* Today button */}
                          <button onClick={() => { const today = new Date(); setCurrentWeek(today); setMiniCalendarMonth(today); setMiniCalendarYear(today.getFullYear()); setShowMiniCalendar(false); }} className="w-full mt-4 px-3 py-2 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors">Today</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Today button */}
              <button
                onClick={() => setCurrentWeek(new Date())}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base transition-colors font-medium ${
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
                              
                              // Get account names for this platform
                              const getAccountNames = (platform) => {
                                if (!post.targets || !post.targets[platform]) {
                                  return ['Default']; // Default account
                                }
                                
                                const target = post.targets[platform];
                                if (target.all === true) {
                                  return ['All']; // All accounts
                                } else if (target.ids && Array.isArray(target.ids)) {
                                  return target.ids.map(id => getAccountName(id)); // Specific account names
                                }
                                
                                return ['Default']; // Default account
                              };
                              
                              const accountNames = getAccountNames(p);
                              const displayText = accountNames.length > 1 ? `${accountNames.length}` : accountNames[0];
                              
                              // Get account details for tooltip
                              const getAccountDetails = (platform) => {
                                if (!post.targets || !post.targets[platform]) {
                                  return [];
                                }
                                
                                const target = post.targets[platform];
                                if (target.all === true) {
                                  return ['All Accounts'];
                                } else if (target.ids && Array.isArray(target.ids)) {
                                  return target.ids.map(id => {
                                    const accountDetails = getAccountInfo(id);
                                    return `${accountDetails.name} (${accountDetails.provider})`;
                                  });
                                }
                                
                                return ['Default Account'];
                              };
                              
                              const accountDetails = getAccountDetails(p);
                              
                              return Icon ? (
                                <div key={p} className="flex items-center space-x-1" title={accountDetails.join(', ')}>
                                  <Icon className={`text-lg ${colorClass}`} />
                                  <span className="text-xs text-gray-500 font-medium">
                                    {displayText}
                                  </span>
                                </div>
                              ) : null;
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
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl rounded-2xl bg-white ring-1 ring-black/5 shadow-2xl overflow-hidden">
              <div className="divide-y divide-gray-100">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4">
                  <h3 className="text-base font-semibold text-gray-900">Post Details</h3>
                              <button
                    onClick={closePostDetails}
                    className="p-2 rounded-xl hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                              </button>
                            </div>

                {/* Body Content */}
                <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-auto">
                {/* Post Content (platform-aware) */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Content</h4>
                  <div className="rounded-xl bg-gray-50 ring-1 ring-black/5 px-4 py-3">
                    {/* Show global content if present */}
                    {selectedPost.content && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">General message</p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedPost.content}</p>
                      </div>
                    )}
                    {/* YouTube specific title/description if scheduled for YouTube */}
                    {selectedPost.platforms?.includes('youtube') && (
                      <div className="border-t pt-3 mt-3">
                        <p className="text-xs text-gray-500 mb-1">YouTube</p>
                        <div className="text-sm">
                          <div className="font-semibold text-gray-900">{selectedPost.youtube_title || '—'}</div>
                          {selectedPost.youtube_description && (
                            <div className="text-sm text-gray-800 whitespace-pre-wrap mt-1">{selectedPost.youtube_description}</div>
                          )}
                        </div>
                      </div>
                    )}
                    {!selectedPost.content && !selectedPost.youtube_title && (
                      <p className="text-sm text-gray-500">No content</p>
                    )}
                  </div>
                </div>

                {/* Post Status */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Status</h4>
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                      selectedPost.status === 'posted' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' :
                      selectedPost.status === 'failed' ? 'bg-red-50 text-red-700 ring-1 ring-red-100' :
                      selectedPost.status === 'draft' ? 'bg-gray-100 text-gray-700 ring-1 ring-gray-200' :
                      'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
                    }`}>
                      {selectedPost.status === 'posted' ? 'Published' :
                       selectedPost.status === 'failed' ? 'Failed' : 
                       selectedPost.status === 'draft' ? 'Draft' : 'Scheduled'}
                    </span>
                    {selectedPost.status === 'failed' && selectedPost.error_message && (
                      <span className="text-sm text-red-600">
                        <FaExclamationTriangle className="inline mr-1" />
                        {selectedPost.error_message}
                      </span>
                    )}
                  </div>
                </div>

                {/* Platforms & Accounts */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Platforms & Accounts</h4>
                  <div className="rounded-2xl ring-1 ring-black/5 p-4">
                    <div className="flex items-start gap-3">
                    {selectedPost.platforms?.map((platform) => {
                      const Icon = platformIcons[platform];
                      const colorClass = platformColors[platform];
                        
                        // Get account information for this platform
                        const getAccountInfo = (platform) => {
                          if (!selectedPost.targets || !selectedPost.targets[platform]) {
                            return { accounts: [], isAll: false };
                          }
                          
                          const target = selectedPost.targets[platform];
                          if (target.ids && Array.isArray(target.ids)) {
                            return { accounts: target.ids, isAll: false };
                          } else if (target.all === true) {
                            return { accounts: [], isAll: true };
                          }
                          
                          return { accounts: [], isAll: false };
                        };
                        
                        const accountInfo = getAccountInfo(platform);
                        
                      return Icon ? (
                          <div key={platform} className="flex items-start gap-3">
                            {/* Platform Badge */}
                            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <Icon className={`text-sm ${colorClass}`} />
                            </div>
                            
                            {/* Account Chips */}
                            <div className="flex flex-wrap gap-1">
                              {accountInfo.isAll ? (
                                <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 text-xs px-2.5 py-1">
                                  All Accounts
                                </span>
                              ) : accountInfo.accounts.length > 0 ? (
                                accountInfo.accounts.map((accountId, index) => {
                                  const accountName = getAccountName(accountId);
                                  const accountDetails = getAccountInfo(accountId);
                                  return (
                                    <span 
                                      key={index}
                                      className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 text-gray-700 text-xs px-2.5 py-1"
                                      title={`Account ID: ${accountId}`}
                                    >
                                      {accountDetails.avatar ? (
                                        <img 
                                          src={accountDetails.avatar} 
                                          alt={accountName}
                                          className="w-4 h-4 rounded-full object-cover"
                                          onError={(e) => {
                                            e.target.style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center">
                                          <span className="text-[8px] font-medium text-gray-600">
                                            {accountName.charAt(0).toUpperCase()}
                                          </span>
                                        </div>
                                      )}
                                      {accountName}
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 text-gray-700 text-xs px-2.5 py-1">
                                  <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center">
                                    <span className="text-[8px] font-medium text-gray-600">D</span>
                                  </div>
                                  Default Account
                                </span>
                              )}
                            </div>
                        </div>
                      ) : null;
                    })}
                    </div>
                  </div>
                        </div>

                {/* Scheduled Time */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Scheduled Time</h4>
                  <div className="flex items-center space-x-2 text-sm text-gray-800">
                    <FaClock className="text-gray-500 w-4 h-4" />
                    <span>
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
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Media ({selectedPost.media_urls.length})</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {selectedPost.media_urls.map((url, index) => {
                        // Check if the media is a video
                        const isVideo = url.includes('video') || 
                                      url.includes('.mp4') || 
                                      url.includes('.mov') || 
                                      url.includes('.avi') || 
                                      url.includes('.webm') ||
                                      url.includes('cloudinary') && url.includes('video');
                        
                        return (
                          <div key={index} className="relative w-full aspect-video rounded-xl overflow-hidden ring-1 ring-black/5 bg-gray-100">
                            {isVideo ? (
                              <>
                                <img 
                                  src={url}
                                  alt={`Video thumbnail ${index + 1}`}
                                  className="absolute inset-0 h-full w-full object-cover"
                                />
                                <div className="absolute left-2 bottom-2 rounded-md bg-black/70 text-white text-[10px] px-1.5 py-0.5">
                                  ▶ Play
                                </div>
                              </>
                            ) : (
                              <img
                                src={url}
                                alt={`Media ${index + 1}`}
                                className="absolute inset-0 h-full w-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            )}
                            <div className="absolute inset-0 bg-gray-200 flex items-center justify-center" style={{display: 'none'}}>
                              <span className="text-gray-500 text-sm">Failed to load</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                </div>

                {/* Actions */}
                {selectedPost.status === 'pending' && (
                  <div className="px-6 py-4 flex items-center justify-between gap-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          handleEditClick(selectedPost);
                          closePostDetails();
                        }}
                        className="h-10 rounded-xl bg-white ring-1 ring-black/5 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-600 px-4 text-sm font-medium text-gray-700"
                      >
                        Edit Content
                      </button>
                      <button
                        onClick={() => {
                          handleReschedule(selectedPost);
                          closePostDetails();
                        }}
                        className="h-10 rounded-xl bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600 px-4 text-sm font-medium"
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
                      className="h-10 rounded-xl bg-red-600 text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-600 px-4 text-sm font-medium disabled:opacity-50"
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
                        {postToEdit.media_urls.map((url, index) => {
                          // Check if the media is a video
                          const isVideo = url.includes('video') || 
                                        url.includes('.mp4') || 
                                        url.includes('.mov') || 
                                        url.includes('.avi') || 
                                        url.includes('.webm') ||
                                        url.includes('cloudinary') && url.includes('video');
                          
                          return (
                            <div key={index} className="relative">
                              {isVideo ? (
                                <div className="relative w-full h-24 bg-black rounded-lg border overflow-hidden">
                                  <video
                                    src={url}
                                    className="w-full h-full object-cover"
                                    controls
                                    preload="metadata"
                                  >
                                    Your browser does not support the video tag.
                                  </video>
                                  <div className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 rounded flex items-center space-x-1">
                                    <span>🎥</span>
                                  </div>
                                  <button className="absolute top-1 left-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600">
                                    ×
                                  </button>
                                </div>
                              ) : (
                                <div className="relative">
                                  <img
                                    src={url}
                                    alt={`Media ${index + 1}`}
                                    className="w-full h-24 object-cover rounded-lg border"
                                  />
                                  <button className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600">
                                    ×
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
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