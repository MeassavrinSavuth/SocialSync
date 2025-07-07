import React, { useState, useRef, useEffect } from 'react';
import { useTasks } from '../../hooks/api/useTasks';
import { useTaskReactions } from '../../hooks/api/useTaskReactions';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';
import Modal from './Modal';
import PlatformSelector from './PlatformSelector';
import MiniFacebookPreview from './MiniFacebookPreview';
import MiniMastodonPreview from './MiniMastodonPreview';
import CommentSection from './CommentSection';
import { FaUserPlus, FaTrash, FaEdit, FaCommentAlt, FaClock, FaPlus } from 'react-icons/fa';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '👎'];

export default function TasksSection({ workspaceId, teamMembers, currentUser }) {
  const [showModal, setShowModal] = useState(false);
  const [editTaskId, setEditTaskId] = useState(null);
  const [openCommentTaskId, setOpenCommentTaskId] = useState(null);
  
  // Backend integration
  const { tasks, loading, error, createTask, updateTask, deleteTask } = useTasks(workspaceId);

  const handleOpenModal = () => {
    setShowModal(true);
    setEditTaskId(null);
  };

  const handleEditTask = (task) => {
    setEditTaskId(task.id);
    setShowModal(true);
  };

  const handleDeleteTask = async (taskId) => {
    await deleteTask(taskId);
  };

  // Get the task being edited
  const editingTask = editTaskId ? tasks.find(t => t.id === editTaskId) : null;

  // Status badge color
  const statusColor = (status) => {
    if (status === 'Todo') return 'bg-gray-100 text-gray-700 border-gray-200';
    if (status === 'In Progress') return 'bg-yellow-50 text-yellow-800 border-yellow-200';
    return 'bg-green-50 text-green-800 border-green-200';
  };

  // Show loading state
  if (loading) {
    return (
      <section className="w-full">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading tasks...</div>
        </div>
      </section>
    );
  }

  // Show error state
  if (error) {
    return (
      <section className="w-full">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">Error loading tasks: {error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full">
      <div className="mb-6">
        <button
          className="py-2 px-6 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-semibold flex items-center gap-2"
          onClick={handleOpenModal}
        >
          <FaPlus className="text-base" /> Add Task
        </button>
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)}>
        <TaskForm
          onSubmit={async (taskData) => {
            if (editTaskId) {
              // Update existing task
              const updates = {
                title: taskData.title,
                description: taskData.description,
                status: taskData.status,
                assigned_to: taskData.assigned_to,
                due_date: taskData.due_date,
              };
              const success = await updateTask(editTaskId, updates);
              if (success) {
                setEditTaskId(null);
                setShowModal(false);
              }
              return success;
            } else {
              // Create new task
              const success = await createTask(taskData);
              if (success) {
                setShowModal(false);
              }
              return success;
            }
          }}
          onCancel={() => {
            setShowModal(false);
            setEditTaskId(null);
          }}
          teamMembers={teamMembers}
          initialData={editingTask}
        />
      </Modal>
      <div className="space-y-8">
        {tasks.map((task) => (
          <TaskReactionWrapper 
            key={task.id} 
            task={task} 
            workspaceId={workspaceId}
            teamMembers={teamMembers}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onUpdateTask={updateTask}
            openCommentTaskId={openCommentTaskId}
            setOpenCommentTaskId={setOpenCommentTaskId}
          />
        ))}
      </div>
    </section>
  );
}

// Separate component to handle reactions for each task
function TaskReactionWrapper({ 
  task, 
  workspaceId, 
  teamMembers, 
  onEditTask, 
  onDeleteTask, 
  onUpdateTask,
  openCommentTaskId,
  setOpenCommentTaskId
}) {
  const { reactions, userReactions, toggleReaction } = useTaskReactions(workspaceId, task.id);

  const handleReact = async (reactionType) => {
    await toggleReaction(reactionType);
  };

  const statusColor = (status) => {
    if (status === 'Todo') return 'bg-gray-100 text-gray-700 border-gray-200';
    if (status === 'In Progress') return 'bg-yellow-50 text-yellow-800 border-yellow-200';
    return 'bg-green-50 text-green-800 border-green-200';
  };

  return (
    <div
      className="bg-white rounded-2xl shadow-lg p-6 relative flex flex-col border-l-4 transition hover:shadow-xl group"
      style={{ borderColor: task.status === 'Todo' ? '#a0aec0' : task.status === 'In Progress' ? '#ecc94b' : '#38a169' }}
    >
      {/* Status and actions */}
      <div className="flex items-center justify-between mb-2">
        <div className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm border ${statusColor(task.status)} text-gray-800`}>{task.status}</div>
        <div className="flex gap-2">
          <button className="text-xs text-blue-700 hover:underline flex items-center rounded px-2 py-1" onClick={() => onEditTask(task)} title="Edit"><FaEdit className="mr-1" />Edit</button>
          <button className="text-xs text-red-600 hover:underline flex items-center rounded px-2 py-1" onClick={() => onDeleteTask(task.id)} title="Delete"><FaTrash className="mr-1" />Delete</button>
        </div>
      </div>
      {/* Title and content */}
      <div className="mb-1 text-base font-semibold text-gray-800">{task.title}</div>
      <div className="mb-2 text-gray-700 whitespace-pre-line text-sm">{task.description}</div>
      {/* Media preview */}
      {task.media && (
        <div className="my-2">
          {task.media.includes('video') || task.media.match(/\.(mp4|mov|avi|mkv|wmv|flv|webm)$/i) ? (
            <video src={task.media} controls className="mx-auto max-w-xs h-32 object-contain rounded-xl border" />
          ) : (
            <img src={task.media} alt="Task Media" className="mx-auto max-w-xs h-32 object-contain rounded-xl border" />
          )}
        </div>
      )}
      {/* Timestamp */}
      <div className="flex items-center text-xs text-gray-500 mb-2">
        <FaClock className="mr-1" />
        {task.created_at ? new Date(task.created_at).toLocaleString() : 'Just now'}
      </div>
      {/* Assigned members */}
      <div className="flex items-center mt-2">
        <span className="text-xs text-gray-700 mr-2">Assigned:</span>
        {task.assigned_to ? (
          (() => {
            const member = teamMembers.find(m => m.id === task.assigned_to);
            return member ? (
              <div className="flex items-center">
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-7 h-7 rounded-full border mr-1 hover:scale-110 transition"
                  title={member.name}
                />
                <span className="text-xs text-gray-600">{member.name}</span>
              </div>
            ) : (
              <span className="text-xs text-gray-400">Unknown user</span>
            );
          })()
        ) : (
          <span className="text-xs text-gray-400">None</span>
        )}
      </div>
      {/* Reactions Bar */}
      <div className="flex items-center gap-4 mt-4">
        <button
          className={`flex items-center text-xs rounded px-2 py-1 transition ${
            userReactions.includes('thumbsUp') 
              ? 'text-blue-700 bg-blue-100' 
              : 'text-blue-700 hover:underline'
          }`}
          onClick={() => handleReact('thumbsUp')}
        >
          👍 Like {reactions.thumbsUp > 0 && <span className="ml-1 font-bold">{reactions.thumbsUp}</span>}
        </button>
        <button
          className={`flex items-center text-xs rounded px-2 py-1 transition ${
            userReactions.includes('heart') 
              ? 'text-red-700 bg-red-100' 
              : 'text-red-700 hover:underline'
          }`}
          onClick={() => handleReact('heart')}
        >
          ❤️ Heart {reactions.heart > 0 && <span className="ml-1 font-bold">{reactions.heart}</span>}
        </button>
        <button
          className="flex items-center text-xs text-blue-700 hover:underline rounded px-2 py-1"
          onClick={() => setOpenCommentTaskId(openCommentTaskId === task.id ? null : task.id)}
        >
          <FaCommentAlt className="mr-1" /> Comment
        </button>
        {/* Status dropdown */}
        <select
          className="ml-auto text-xs border rounded px-2 py-1 text-gray-800 bg-white"
          value={task.status}
          onChange={async (e) => {
            await onUpdateTask(task.id, { status: e.target.value });
          }}
        >
          <option value="Todo">Todo</option>
          <option value="In Progress">In Progress</option>
          <option value="Done">Done</option>
        </select>
      </div>
      {/* Comments section */}
      {openCommentTaskId === task.id && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <CommentSection taskId={task.id} workspaceId={workspaceId} />
        </div>
      )}
    </div>
  );
} 