"use client";
import React, { useState, useEffect } from "react";
import { FaClock, FaExclamationTriangle } from "react-icons/fa";
import { FaCalendarAlt } from "react-icons/fa";
import { FaFacebook, FaInstagram, FaYoutube, FaTwitter, FaTrash } from "react-icons/fa";
import { SiMastodon } from "react-icons/si";
import { useProtectedFetch } from "../../hooks/auth/useProtectedFetch";
import AuthErrorModal from "../../components/AuthErrorModal";

// Platform icons mapping
const platformIcons = {
  facebook: FaFacebook,
  instagram: FaInstagram,
  youtube: FaYoutube,
  twitter: FaTwitter,
  mastodon: SiMastodon,
};

const platformColors = {
  facebook: "text-blue-600",
  instagram: "text-pink-500",
  youtube: "text-red-600",
  twitter: "text-sky-500",
  mastodon: "text-purple-600",
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
  const [editContent, setEditContent] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

  const protectedFetch = useProtectedFetch();
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

  useEffect(() => {
    fetchScheduledPosts();
  }, []);

  const fetchScheduledPosts = async () => {
    try {
      const response = await protectedFetch(`${API_BASE_URL}/api/scheduled-posts`);
      if (!response || !response.ok) throw new Error("Failed to fetch scheduled posts");
      const data = await response.json();
      setScheduledPosts(data || []);
    } catch (err) {
      setError(err.message || "Failed to fetch scheduled posts");
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
      const response = await protectedFetch(`${API_BASE_URL}/api/scheduled-posts/${postToDelete.id}`, { method: "DELETE" });
      if (!response || !response.ok) throw new Error("Failed to delete post");
      setScheduledPosts(prev => prev.filter(p => p.id !== postToDelete.id));
      setShowDeleteModal(false);
      setPostToDelete(null);
    } catch (err) {
      setError(err.message || "Failed to delete scheduled post");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditClick = (post) => {
    setPostToEdit(post);
    setEditContent(post.content || "");
    setEditDate(new Date(post.scheduled_time).toISOString().split("T")[0]);
    setEditTime(new Date(post.scheduled_time).toTimeString().slice(0, 5));
    setShowEditModal(true);
  };

  const savePostChanges = async () => {
    if (!postToEdit) return;
    if (!editDate || !editTime) {
      setError("Please provide date and time for reschedule");
      return;
    }
    const newScheduledTime = new Date(`${editDate}T${editTime}`).toISOString();
    try {
      const response = await protectedFetch(`${API_BASE_URL}/api/scheduled-posts/${postToEdit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent, scheduled_time: newScheduledTime }),
      });
      if (!response || !response.ok) throw new Error("Failed to update post");
      // refresh list
      await fetchScheduledPosts();
      setShowEditModal(false);
      setPostToEdit(null);
    } catch (err) {
      setError(err.message || "Failed to update scheduled post");
    }
  };

  // Week view helpers
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
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const formatDate = (date) => date.toISOString().split("T")[0];
  const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const getPostsForDate = (date) => {
    const dateStr = formatDate(new Date(date));
    return scheduledPosts.filter(post => formatDate(new Date(post.scheduled_time)) === dateStr);
  };

  const getTotalScheduledPosts = () => scheduledPosts.length;
  const getTotalFailedPosts = () => scheduledPosts.filter(p => p.status === "failed").length;
  const getTotalPostedPosts = () => scheduledPosts.filter(p => p.status === "posted").length;

  const getPostsForTimeSlot = (date, hour) => {
    const posts = getPostsForDate(date);
    return posts.filter(p => new Date(p.scheduled_time).getHours() === hour);
  };

  const goToPreviousWeek = () => setCurrentWeek(new Date(currentWeek.getFullYear(), currentWeek.getMonth(), currentWeek.getDate() - 7));
  const goToNextWeek = () => setCurrentWeek(new Date(currentWeek.getFullYear(), currentWeek.getMonth(), currentWeek.getDate() + 7));

  const renderTimeSlots = () => {
    const slots = [];
    for (let h = 0; h < 24; h++) slots.push(<div key={h} className="h-16 border-b border-gray-200 text-xs text-gray-500 p-2 text-center">{String(h).padStart(2, '0')}:00</div>);
    return slots;
  };

  const renderWeekDays = () => {
    const days = getWeekDays();
    return days.map((d, idx) => (
      <div key={idx} className="col-span-1 border-r border-gray-200">
        <div className="h-16 border-b border-gray-200 p-2 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
            <div className="text-xs text-gray-500">{d.toLocaleDateString()}</div>
          </div>
        </div>
        <div>
          {Array.from({ length: 24 }).map((_, hour) => {
            const posts = getPostsForTimeSlot(d, hour);
            return (
              <div key={hour} className={`h-16 p-2 border-b border-gray-100 ${posts.length ? 'bg-gray-50' : ''}`}>
                {posts.map(post => (
                  <div key={post.id} className="bg-white p-2 rounded shadow-sm text-xs mb-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium truncate max-w-[140px]">{post.content?.slice(0, 80) || 'No content'}</div>
                      <div className="flex items-center space-x-2">
                        <div className="text-gray-500 text-xs">{formatTime(post.scheduled_time)}</div>
                        <button onClick={() => handleEditClick(post)} className="text-sm text-blue-600">Edit</button>
                        <button onClick={() => handleDeleteClick(post)} className="text-sm text-red-600">Delete</button>
                      </div>
                    </div>
                    <div className="mt-1 flex space-x-2">
                      {post.platforms?.map(p => {
                        const Icon = platformIcons[p];
                        const color = platformColors[p] || 'text-gray-700';
                        return Icon ? (
                          <div key={p} className={`flex items-center space-x-1 text-xs ${color} bg-gray-100 px-2 py-0.5 rounded`}> 
                            <Icon />
                            <span className="capitalize">{p}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-6xl mx-auto text-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading scheduled posts...</p>
        </div>
      </div>
    );
  }

  const days = getWeekDays();

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Scheduled Posts</h1>
          <p className="text-gray-700 font-medium">View your scheduled posts on the calendar</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-8 w-full">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button onClick={goToPreviousWeek} className="p-3 text-gray-600 hover:bg-gray-100 rounded-lg">←</button>
              <h2 className="text-3xl font-bold text-gray-900">{`${days[0].toLocaleDateString()} - ${days[6].toLocaleDateString()}`}</h2>
              <button onClick={goToNextWeek} className="p-3 text-gray-600 hover:bg-gray-100 rounded-lg">→</button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">Scheduled: <span className="font-semibold text-blue-600">{getTotalScheduledPosts()}</span></span>
              </div>

              <div className="relative">
                <button onClick={() => setShowMiniCalendar(!showMiniCalendar)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2">
                  <span>📅</span>
                  <span>Select Week</span>
                  <span>▼</span>
                </button>
                {showMiniCalendar && (
                  <div className="absolute top-full right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-xl z-50 w-96">
                    <div className="flex">
                      <div className="flex-1 p-4">
                        <div className="flex items-center justify-between mb-4">
                          <button onClick={() => setMiniCalendarMonth(new Date(miniCalendarMonth.getFullYear(), miniCalendarMonth.getMonth()-1))} className="p-1 hover:bg-gray-100 rounded">←</button>
                          <h3 className="font-semibold text-gray-900">{miniCalendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                          <button onClick={() => setMiniCalendarMonth(new Date(miniCalendarMonth.getFullYear(), miniCalendarMonth.getMonth()+1))} className="p-1 hover:bg-gray-100 rounded">→</button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {['S','M','T','W','T','F','S'].map((d,i)=> <div key={i} className="h-8 flex items-center justify-center text-xs font-medium text-gray-500">{d}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {getMiniCalendarDays(miniCalendarMonth, miniCalendarYear).map((date, index) => (
                            <div key={index} className="h-10 flex items-center justify-center text-xs p-1 rounded hover:bg-gray-100">{date.getDate()}</div>
                          ))}
                        </div>
                      </div>
                      <div className="w-32 p-4 bg-gray-50 border-l border-gray-200">
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <button onClick={() => setMiniCalendarYear(miniCalendarYear - 1)} className="p-1 hover:bg-gray-200 rounded text-xs">↑</button>
                            <span className="font-semibold text-gray-900">{miniCalendarYear}</span>
                            <button onClick={() => setMiniCalendarYear(miniCalendarYear + 1)} className="p-1 hover:bg-gray-200 rounded text-xs">↓</button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((month, index) => (
                            <button key={month} onClick={() => setMiniCalendarMonth(new Date(miniCalendarYear, index))} className={`p-2 text-xs rounded hover:bg-gray-200 ${index === miniCalendarMonth.getMonth() ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>{month}</button>
                          ))}
                        </div>
                        <button onClick={() => { setMiniCalendarMonth(new Date()); setMiniCalendarYear(new Date().getFullYear()); }} className="w-full mt-4 px-3 py-2 text-xs bg-gray-200 text-gray-700 rounded">Today</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={() => setCurrentWeek(new Date())} className={`px-4 py-2 rounded-lg ${formatDate(getWeekStart(currentWeek)) === formatDate(getWeekStart(new Date())) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Today</button>
            </div>
          </div>

          <div className="grid grid-cols-8 gap-0 w-full mt-6">
            <div className="w-24 border-r-2 border-gray-300">
              <div className="h-16 border-b-2 border-gray-300"></div>
              {renderTimeSlots()}
            </div>

            <div className="col-span-7 grid grid-cols-7">
              {renderWeekDays()}
            </div>
          </div>
        </div>

        {/* Post details modal */}
        {showPostDetails && selectedPost && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Post Details</h3>
                  <button onClick={() => { setShowPostDetails(false); setSelectedPost(null); }} className="p-2 text-gray-400 hover:text-gray-600">×</button>
                </div>

                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Content</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-800 whitespace-pre-wrap">{selectedPost.content || 'No content'}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Status</h4>
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${selectedPost.status === 'posted' ? 'bg-green-100 text-green-800' : selectedPost.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{selectedPost.status === 'posted' ? 'Posted' : selectedPost.status === 'failed' ? 'Failed' : 'Scheduled'}</span>
                    {selectedPost.status === 'failed' && selectedPost.error_message && (<span className="text-red-600 text-sm"><FaExclamationTriangle className="inline mr-1"/>{selectedPost.error_message}</span>)}
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Platforms</h4>
                  <div className="flex space-x-3">
                    {selectedPost.platforms?.map((platform) => {
                      const Icon = platformIcons[platform];
                      const colorClass = platformColors[platform];
                      return Icon ? (
                        <div key={platform} className="flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded">
                          <Icon className={colorClass} />
                          <span className="capitalize">{platform}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Scheduled Time</h4>
                  <div className="flex items-center space-x-2 text-gray-700"><FaClock className="text-gray-500"/>
                    <span className="font-medium">{new Date(selectedPost.scheduled_time).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {selectedPost.media_urls && selectedPost.media_urls.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-800 mb-3">Media ({selectedPost.media_urls.length})</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedPost.media_urls.map((url, index) => (
                        <div key={index} className="relative">
                          <img src={url} alt={`Media ${index + 1}`} className="w-full h-32 object-cover rounded-lg border" onError={(e) => { e.target.style.display = 'none'; }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPost.status === 'pending' && (
                  <div className="flex justify-between pt-4 border-t border-gray-200">
                    <div className="flex space-x-3">
                      <button onClick={() => { setShowEditModal(true); setPostToEdit(selectedPost); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Edit Content</button>
                      <button onClick={() => { setShowEditModal(true); setPostToEdit(selectedPost); }} className="px-4 py-2 bg-purple-600 text-white rounded-lg">Reschedule</button>
                    </div>
                    <button onClick={() => { setShowDeleteModal(true); setPostToDelete(selectedPost); }} disabled={deleteLoading} className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50">{deleteLoading ? 'Deleting...' : 'Delete Post'}</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete modal */}
        {showDeleteModal && postToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4"><svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg></div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Delete Scheduled Post</h3>
                    <p className="text-sm text-gray-600">This action cannot be undone</p>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-gray-700 mb-3">Are you sure you want to delete this scheduled post?</p>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-800 font-medium truncate">{postToDelete.content?.substring(0,100)}...</p>
                    <p className="text-xs text-gray-500 mt-1">Scheduled for: {new Date(postToDelete.scheduled_time).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button onClick={() => { setShowDeleteModal(false); setPostToDelete(null); }} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg">Cancel</button>
                  <button onClick={confirmDelete} disabled={deleteLoading} className="px-4 py-2 bg-red-600 text-white rounded-lg">{deleteLoading ? 'Deleting...' : 'Delete Post'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit modal - simplified */}
        {showEditModal && postToEdit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Edit Scheduled Post</h3>
                  <button onClick={() => { setShowEditModal(false); setPostToEdit(null); }} className="p-2 text-gray-400 hover:text-gray-600">×</button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Post Content</label>
                    <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 resize-none" rows={4} placeholder="Enter your post content..." />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reschedule Date & Time</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Platforms</label>
                    <div className="flex flex-wrap gap-2">
                      {postToEdit.platforms?.map((platform) => (
                        <div key={platform} className="px-3 py-1 bg-gray-100 rounded">{platform}</div>
                      ))}
                    </div>
                  </div>

                  {postToEdit.media_urls && postToEdit.media_urls.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Media Files ({postToEdit.media_urls.length})</label>
                      <div className="grid grid-cols-3 gap-4">
                        {postToEdit.media_urls.map((url, index) => (
                          <div key={index} className="relative">
                            <img src={url} alt={`Media ${index + 1}`} className="w-full h-24 object-cover rounded-lg border" />
                            <button className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button onClick={() => { setShowEditModal(false); setPostToEdit(null); }} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg">Cancel</button>
                    <button onClick={savePostChanges} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save Changes</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      <AuthErrorModal isOpen={false} onClose={() => {}} errors={[]} onReconnect={() => {}} />
    </div>
  );
}