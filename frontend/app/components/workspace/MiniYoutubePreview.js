import { useState, useRef, useEffect } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { FaThumbsUp, FaCommentAlt, FaShare, FaGlobeAmericas, FaEllipsisH, FaPlay } from 'react-icons/fa';

export default function MiniYoutubePreview({ task, onReact, showReactions = true, showTitle = false, fullWidth = false, onEdit, onPost, onDelete, fitMode = 'auto', workspaceId, canEdit = true, canPublish = true }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [likeCount, setLikeCount] = useState(task?.reactions?.thumbsUp || 0);
  const [liked, setLiked] = useState(false);
  const [lastUpdatedByName, setLastUpdatedByName] = useState(task?.last_updated_by_name || null);
  const [lastUpdatedByAvatar, setLastUpdatedByAvatar] = useState(task?.last_updated_by_avatar || null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(task?.updated_at || null);

  // Use shared WebSocket connection
  const { subscribe } = useWebSocket();

  // Subscribe to WebSocket messages
  useEffect(() => {
    const unsubscribe = subscribe((msg) => {
      if (msg.type === 'draft_reaction_changed' && msg.draft_id === task.id && msg.reactions) {
        if (typeof msg.reactions.thumbsUp === 'number') {
          setLikeCount(msg.reactions.thumbsUp);
        }
      } else if (msg.type === 'member_role_changed') {
        setMenuOpen(false);
      } else if (msg.type === 'draft_updated' && msg.draft_id === task.id && msg.last_updated_by && msg.updated_at) {
        // Update last updated info
        setLastUpdatedByName(msg.last_updated_by_name || lastUpdatedByName);
        setLastUpdatedAt(msg.updated_at);
        if (msg.last_updated_by_avatar) setLastUpdatedByAvatar(msg.last_updated_by_avatar);
      }
    });

    return unsubscribe;
  }, [subscribe, task.id]);

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
    setNewComment("");
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

  return (
    <div className={`bg-white rounded-xl shadow border border-red-200 ring-1 ring-red-100 ${fullWidth ? 'w-full' : 'w-full max-w-lg mx-auto'}`}>
      {/* Video Thumbnail */}
      {task.photo && (
        <div className="relative w-full aspect-video bg-black">
          <img
            src={task.photo}
            alt="Video thumbnail"
            className="w-full h-full object-cover"
          />
          
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
        <div className="flex items-start gap-3 w-full">
          <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            <img src={task.author.avatar} alt={task.author.name} className="w-full h-full rounded-full object-cover" />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <h3 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1 break-words">
              {task.title || "Your Video Title"}
            </h3>
            <p className="text-xs text-gray-600 mb-1 truncate">{task.author.name}</p>
            <p className="text-xs text-gray-500 truncate">42K views • 2 hours ago</p>
          </div>
          <div className="relative flex-shrink-0 z-10 ml-2 mr-1" ref={menuRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className={`text-gray-500 text-lg cursor-pointer hover:text-gray-700 ${(!canEdit && !canPublish) ? 'hidden' : ''}`}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (canEdit || canPublish) setMenuOpen((open) => !open); }}
            >
              <FaEllipsisH />
            </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-36 bg-white border rounded-xl shadow-lg z-20 overflow-hidden">
                {canEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onEdit && onEdit();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Edit
                  </button>
                )}
                {canPublish && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onPost && onPost();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Post
                  </button>
                )}
                {canEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onDelete && onDelete();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Description preview */}
        {task.description && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-600 line-clamp-2 break-words">{task.description}</p>
          </div>
        )}
      </div>

      {/* Actions Bar */}
      {showReactions && (
        <div className="flex items-center gap-4 py-2 border-t border-gray-200 text-gray-700 text-sm relative z-10">
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

      {/* Comments Section (toggle) */}
      {showComments && (
        <div className="px-4 pt-2 pb-4">
          <div className="space-y-2 mb-2">
            <div className="text-xs text-gray-400">No comments yet.</div>
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

      {/* Last Updated By */}
      {lastUpdatedByName && lastUpdatedAt && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            {lastUpdatedByAvatar && (
              <img src={lastUpdatedByAvatar} alt={lastUpdatedByName} className="w-4 h-4 rounded-full border flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <span className="block truncate">
                Last updated by <span className="font-medium">{lastUpdatedByName}</span>
              </span>
              <span className="block text-xs text-gray-500 truncate">
                {new Date(lastUpdatedAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
