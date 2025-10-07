import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useDraftComments } from '../../hooks/api/useDraftComments';
import { useUser } from '../../hooks/auth/useUser';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { FaThumbsUp, FaCommentAlt, FaShare, FaGlobeAmericas, FaEllipsisH } from 'react-icons/fa';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '👎'];

const MiniFacebookPreview = memo(function MiniFacebookPreview({ task, onReact, showReactions = true, showTitle = false, fullWidth = false, onEdit, onPost, onDelete, fitMode = 'auto', workspaceId, canEdit = true, canPublish = true }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();
  const { comments, addComment, deleteComment } = useDraftComments(workspaceId, task.id);
  const [newComment, setNewComment] = useState("");
  const { profileData: currentUser } = useUser();
  const { subscribe } = useWebSocket();
  const [showComments, setShowComments] = useState(false);
  const [openReactionPicker, setOpenReactionPicker] = useState(null);
  const [isPortrait, setIsPortrait] = useState(null); // null until loaded
  const [likeCount, setLikeCount] = useState(task?.reactions?.thumbsUp || 0);
  const [liked, setLiked] = useState(false);
  const [lastUpdatedByName, setLastUpdatedByName] = useState(task?.last_updated_by_name || null);
  const [lastUpdatedByAvatar, setLastUpdatedByAvatar] = useState(task?.last_updated_by_avatar || null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(task?.updated_at || null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const ok = await addComment(newComment.trim());
    if (ok) setNewComment("");
  };

  const handleImgLoad = (e) => {
    try {
      const { naturalWidth, naturalHeight } = e.target;
      setIsPortrait(naturalHeight > naturalWidth);
    } catch (_) {
      setIsPortrait(false);
    }
  };

  const resolveImgClass = () => {
    // Make image fill the card area without gray background bars.
    // Default to cover; if caller forces contain, keep contain but drop background.
    if (fitMode === 'contain') return 'object-contain';
    return 'object-cover';
  };

  const handleLike = async () => {
    try {
      const res = await fetch(`${(process.env.NEXT_PUBLIC_API_BASE_URL || 'https://socialsync-j7ih.onrender.com')}/api/workspaces/${workspaceId}/drafts/${task.id}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('accessToken') : ''}`,
        },
        body: JSON.stringify({ reaction_type: 'thumbsUp' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.thumbsUp === 'number') setLikeCount(data.thumbsUp);
        if (data.status === 'added') setLiked(true);
        if (data.status === 'removed') setLiked(false);
      }
    } catch (_) {}
  };

  // Fetch initial reaction counts (so other users see the number even after reload)
  useEffect(() => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://socialsync-j7ih.onrender.com';
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
    const fetchCounts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/drafts/${task.id}/reactions`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.thumbsUp === 'number') setLikeCount(data.thumbsUp);
      } catch (_) {}
    };
    if (workspaceId && task?.id) fetchCounts();
  }, [workspaceId, task?.id]);

  // Live like count via shared WebSocket
  useEffect(() => {
    if (!workspaceId || !task?.id) return;
    
    const unsubscribe = subscribe((msg) => {
      console.log('MiniFacebookPreview received WebSocket message:', msg);
      if (msg.type === 'draft_reaction_changed' && msg.draft_id === task.id && msg.reactions) {
        if (typeof msg.reactions.thumbsUp === 'number') {
          setLikeCount(msg.reactions.thumbsUp);
        }
      } else if (msg.type === 'member_role_changed') {
        setMenuOpen(false);
      } else if (msg.type === 'draft_updated' && msg.draft_id === task.id && msg.last_updated_by && msg.updated_at) {
        console.log('MiniFacebookPreview: Updating last updated info:', {
          last_updated_by_name: msg.last_updated_by_name,
          last_updated_by_avatar: msg.last_updated_by_avatar,
          updated_at: msg.updated_at
        });
        // Update last updated info
        setLastUpdatedByName(msg.last_updated_by_name || lastUpdatedByName);
        setLastUpdatedAt(msg.updated_at);
        if (msg.last_updated_by_avatar) setLastUpdatedByAvatar(msg.last_updated_by_avatar);
      }
    });
    
    return unsubscribe;
  }, [workspaceId, task?.id, subscribe]);

  return (
    <div className={`bg-white rounded-xl shadow border border-blue-200 ring-1 ring-blue-100 ${fullWidth ? 'w-full' : 'w-full max-w-lg mx-auto'}`}>
      {/* Header */}
      <div className="flex items-center px-4 pt-4 pb-2 justify-between relative">
        <div className="flex items-center">
          <img src={task.author.avatar} alt={task.author.name} className="w-11 h-11 rounded-full border mr-3" />
          <div className="flex flex-col">
            <span className="font-semibold text-[15px] text-gray-900 leading-tight">{task.author.name}</span>
            <span className="flex items-center text-xs text-gray-500 gap-1">
              {task.created_at ? new Date(task.created_at).toLocaleString() : 'Preview'}
              <FaGlobeAmericas className="inline-block ml-1 text-xs" />
            </span>
          </div>
        </div>
  <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className={`text-gray-400 text-lg cursor-pointer hover:text-gray-600 ${(!canEdit && !canPublish) ? 'hidden' : ''}`}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (canEdit || canPublish) setMenuOpen((open) => !open); }}
          >
            <FaEllipsisH />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-36 bg-white border rounded-xl shadow-lg z-20 overflow-hidden">
              {canEdit && (
                <button
                  type="button"
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50"
                  onClick={() => { setMenuOpen(false); onEdit && onEdit(); }}
                >
                  Edit
                </button>
              )}
              {canPublish && (
                <button
                  type="button"
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50"
                  onClick={() => { setMenuOpen(false); onPost && onPost(); }}
                >
                  Post
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-50"
                  onClick={() => { setMenuOpen(false); onDelete && onDelete(); }}
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Content */}
      {task.description && String(task.description).trim().length > 0 && (
        <div className="px-4 pb-2">
          <div className="text-[15px] text-gray-900 mb-2 whitespace-pre-line">{task.description}</div>
        </div>
      )}
      {/* Media */}
      {task.photo && (
        <div className="px-4 pb-4">
          <img
            src={task.photo}
            alt="Preview"
            onLoad={handleImgLoad}
            className={`w-full rounded-2xl border ${resolveImgClass()}`}
          />
        </div>
      )}
      {/* Actions Bar */}
      {showReactions && (
        <div className="flex items-center gap-4 py-2 border-t border-gray-200 text-gray-700 text-sm">
          <button
            type="button"
            onClick={handleLike}
            className={`inline-flex items-center gap-2 px-2 py-1 rounded hover:text-blue-600 ${liked ? 'text-blue-600' : 'text-gray-600'}`}
          >
            <FaThumbsUp />
            <span className="font-medium">Like</span>
            <span className="ml-1 font-semibold">{likeCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowComments((v) => !v)}
            aria-expanded={showComments}
            className="text-sm text-blue-500 hover:text-blue-700 focus:outline-none"
          >
            {showComments ? 'Hide Comments' : 'Show Comments'}
          </button>
        </div>
      )}
      {/* Last updated pill */}
      {lastUpdatedByName && lastUpdatedAt && (
        <div className="px-4 pb-2">
          <div className="inline-flex items-center gap-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            {lastUpdatedByAvatar && (
              <img src={lastUpdatedByAvatar} alt={lastUpdatedByName} className="w-4 h-4 rounded-full border" />
            )}
            <span>Last updated by {lastUpdatedByName} at {new Date(lastUpdatedAt).toLocaleString()}</span>
          </div>
        </div>
      )}
      {/* Comments Section (toggle) */}
      {showComments && (
        <div className="px-4 pt-2 pb-4">
          {/* Simple, consistent comment UI */}
          <div className="space-y-2 mb-2">
            {comments.length === 0 && <div className="text-xs text-gray-400">No comments yet.</div>}
            {comments.map((c) => (
              <div key={c.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-sm text-gray-900 mb-1">{c.content}</div>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>By: {c.user_name || c.author?.name || 'User'}</span>
                      <span>•</span>
                      <span>{new Date(c.created_at || Date.now()).toLocaleString()}</span>
                    </div>
                  </div>
                  {c.user_id === currentUser?.id && (
                    <button
                      type="button"
                      onClick={() => deleteComment(c.id)}
                      className="p-1 text-gray-400 hover:text-red-500 focus:outline-none"
                      title="Delete comment"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={handleAddComment} className="space-y-2">
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900 placeholder-gray-400"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
            />
            <div className="flex justify-end">
              <button type="submit" disabled={!newComment.trim()} className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">Post</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
});

export default MiniFacebookPreview; 