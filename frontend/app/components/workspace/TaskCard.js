import { useState } from 'react';
import { useToggle } from '../../hooks/ui/useToggle';
import CommentSection from './CommentSection';
import { useUser } from '../../hooks/auth/useUser';

const TaskCard = ({ task, onUpdate, onDelete, workspaceId, teamMembers = [] }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showComments, toggleComments] = useToggle(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { profileData: currentUser } = useUser();
  const [editForm, setEditForm] = useState({
    title: task.title,
    description: task.description || '',
    status: task.status,
    assigned_to: task.assigned_to || '',
    due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
  });

  const statusColors = {
    'Todo': 'bg-gray-100 text-gray-800',
    'In Progress': 'bg-blue-100 text-blue-800',
    'Review': 'bg-yellow-100 text-yellow-800',
    'Done': 'bg-green-100 text-green-800',
  };

  // Helper function to get user display name
  const getUserDisplayName = (userId) => {
    if (!userId) return 'Unassigned';
    const member = teamMembers.find(m => m.id === userId || m.email === userId);
    return member ? member.name : userId;
  };

  // Helper function to get user avatar
  const getUserAvatar = (userId) => {
    if (!userId) return '/default-avatar.png';
    const member = teamMembers.find(m => m.id === userId || m.email === userId);
    return member ? member.avatar : '/default-avatar.png';
  };

  const handleSave = async () => {
    const updates = {};
    Object.keys(editForm).forEach(key => {
      if (editForm[key] !== task[key]) {
        updates[key] = editForm[key] || null;
      }
    });

    if (Object.keys(updates).length > 0) {
      const success = await onUpdate(task.id, updates);
      if (success) {
        setIsEditing(false);
      }
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this task?')) {
      await onDelete(task.id);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString();
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Done';

  // Show the 3-dot menu for all users in the workspace
  const isOwner = true;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 transition-all duration-200 hover:shadow-md hover:border-gray-300">
      {isEditing ? (
        <div className="space-y-4">
          <input
            type="text"
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500"
            placeholder="Task title"
          />
          <textarea
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500"
            placeholder="Task description"
            rows="3"
          />
          <div className="grid grid-cols-2 gap-4">
            <select
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            >
              <option value="Todo">Todo</option>
              <option value="In Progress">In Progress</option>
              <option value="Review">Review</option>
              <option value="Done">Done</option>
            </select>
            <input
              type="date"
              value={editForm.due_date}
              onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
            />
          </div>
          <select
            value={editForm.assigned_to}
            onChange={(e) => setEditForm({ ...editForm, assigned_to: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          >
            <option value="">Unassigned</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} ({member.email})
              </option>
            ))}
          </select>
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* Header with creator and menu */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <img
                src={task.creator_avatar || '/default-avatar.png'}
                alt={task.creator_name || 'Unknown'}
                className="w-7 h-7 rounded-full border"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 truncate">{task.creator_name || 'Unknown'}</p>
                <p className="text-xs text-gray-500">{task.created_at ? new Date(task.created_at).toLocaleDateString() : 'Today'}</p>
              </div>
            </div>
            {/* Three-dot menu */}
            <div className="relative">
              <button
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-8 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <button
                    className="block w-full text-left px-4 py-2 text-blue-700 hover:bg-blue-100 font-semibold"
                    onClick={() => { setIsEditing(true); setMenuOpen(false); }}
                  >
                    Edit
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 font-semibold"
                    onClick={() => { setMenuOpen(false); handleDelete(); }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Task Title */}
          <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{task.title}</h3>
          
          {/* Task Description */}
          {task.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-3 bg-gray-50 rounded-md px-3 py-2 border border-gray-100">
              {task.description}
            </p>
          )}

          {/* Status and Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[task.status] || statusColors['Todo']}`}>
              {task.status}
            </span>
            {task.assigned_to && (
              <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                <img
                  src={getUserAvatar(task.assigned_to)}
                  alt={getUserDisplayName(task.assigned_to)}
                  className="w-4 h-4 rounded-full border"
                />
                <span>{getUserDisplayName(task.assigned_to)}</span>
              </div>
            )}
            {task.due_date && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                isOverdue ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {formatDate(task.due_date)}
              </span>
            )}
          </div>

          {/* Comments Toggle and Quick Actions */}
          <div className="flex justify-between items-center gap-2">
            <div className="flex gap-2">
              <button
                onClick={toggleComments}
                className="text-sm text-blue-500 hover:text-blue-700 focus:outline-none"
              >
                {showComments ? 'Hide Comments' : 'Show Comments'}
              </button>
              {!task.assigned_to && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-green-500 hover:text-green-700 focus:outline-none"
                >
                  Assign
                </button>
              )}
            </div>
            <select
              value={task.status}
              onChange={async (e) => {
                await onUpdate(task.id, { status: e.target.value });
              }}
              className="text-xs border rounded px-2 py-1 text-gray-800 bg-white min-w-0"
            >
              <option value="Todo">Todo</option>
              <option value="In Progress">In Progress</option>
              <option value="Review">Review</option>
              <option value="Done">Done</option>
            </select>
          </div>
          
          {showComments && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <CommentSection taskId={task.id} workspaceId={workspaceId} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskCard;