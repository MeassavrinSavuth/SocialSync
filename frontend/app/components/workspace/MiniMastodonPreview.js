import { useState, useRef, useEffect } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { FaThumbsUp, FaCommentAlt, FaShare, FaEllipsisH } from 'react-icons/fa';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '👎'];

export default function MiniMastodonPreview({ task, onReact, showReactions = true, showTitle = false, fullWidth = false, onEdit, onPost, onDelete, fitMode = 'auto', workspaceId, canEdit = true, canPublish = true }) {
  const [comments, setComments] = useState(task.comments || []);
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();
  const [openReactionPicker, setOpenReactionPicker] = useState(null);
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

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setComments((prev) => [
      ...prev,
      {
        author: task.author,
        content: newComment,
        timestamp: new Date().toLocaleString(),
        reactions: {},
      },
    ]);
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
        setLikeCount(data.thumbsUp || 0);
        setLiked(data.status === 'added');
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow border border-purple-200 ring-1 ring-purple-100 ${fullWidth ? 'w-full' : 'w-full max-w-lg mx-auto'}`}>
      {/* Header with 3-dot menu */}
      <div className="flex items-center px-4 pt-4 pb-2 justify-between relative">
        <div className="flex items-center">
          <img src={task.author.avatar} alt={task.author.name} className="w-11 h-11 rounded-full border mr-3" />
          <div className="flex flex-col">
            <span className="font-semibold text-[15px] text-gray-900 leading-tight">{task.author.name}</span>
            <span className="flex items-center text-xs text-gray-500 gap-1">
              {task.created_at ? new Date(task.created_at).toLocaleString() : 'Preview'}
              <span className="text-xs">🌍</span>
            </span>
          </div>
        </div>
        <div className="relative">
          <button
            className={`text-gray-400 text-lg cursor-pointer hover:text-gray-200 ${(!canEdit && !canPublish) ? 'hidden' : ''}`}
            onClick={() => { if (canEdit || canPublish) setMenuOpen((open) => !open); }}
          >
            <FaEllipsisH />
          </button>
          {menuOpen && (
            <div ref={menuRef} className="absolute right-0 mt-2 w-32 bg-white border rounded shadow z-20">
              {canEdit && (
                <button className="block w-full text-left px-4 py-2 text-blue-700 hover:bg-blue-100 font-semibold" onClick={() => { setMenuOpen(false); onEdit && onEdit(); }}>Edit</button>
              )}
              {canPublish && (
                <button className="block w-full text-left px-4 py-2 text-blue-700 hover:bg-blue-100 font-semibold" onClick={() => { setMenuOpen(false); onPost && onPost(); }}>Post</button>
              )}
              {canEdit && (
                <button className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 font-semibold" onClick={() => { setMenuOpen(false); onDelete && onDelete(); }}>Delete</button>
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
            className="w-full rounded-2xl border object-cover"
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
      {/* Comments Section (toggle) */}
      {showComments && (
        <div className="px-4 pt-2 pb-4">
          {/* Simple, consistent comment UI */}
          <div className="space-y-2 mb-2">
            {comments.length === 0 && <div className="text-xs text-gray-400">No comments yet.</div>}
            {comments.map((c, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-sm text-gray-900 mb-1">{c.content}</div>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>By: {c.author?.name || 'User'}</span>
                      <span>•</span>
                      <span>{c.timestamp}</span>
                    </div>
                  </div>
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

      {/* Last Updated By */}
      {lastUpdatedByName && lastUpdatedAt && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            {lastUpdatedByAvatar && (
              <img src={lastUpdatedByAvatar} alt={lastUpdatedByName} className="w-4 h-4 rounded-full border" />
            )}
            <span>Last updated by {lastUpdatedByName} at {new Date(lastUpdatedAt).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
} 