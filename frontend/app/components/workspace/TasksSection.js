import React, { useState, useRef, useEffect } from 'react';
import { useTasks } from '../../hooks/api/useTasks';
import { useTaskReactions } from '../../hooks/api/useTaskReactions';
import { useRoleBasedUI } from '../../hooks/auth/usePermissions';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useMedia } from '../../hooks/api/useMedia';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';
import Modal from './Modal';
import PlatformSelector from './PlatformSelector';
import MiniFacebookPreview from './MiniFacebookPreview';
import MiniMastodonPreview from './MiniMastodonPreview';
import CommentSection from './CommentSection';
import { FaUserPlus, FaTrash, FaEdit, FaClock, FaPlus, FaEllipsisH } from 'react-icons/fa';
import { MdOutlineModeComment, MdThumbUpOffAlt, MdFavoriteBorder } from 'react-icons/md';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '👎'];

export default function TasksSection({ workspaceId, teamMembers, currentUser }) {
  const [showModal, setShowModal] = useState(false);
  const [editTaskId, setEditTaskId] = useState(null);
  const [openCommentTaskId, setOpenCommentTaskId] = useState(null);
  const [filterMember, setFilterMember] = useState('all');
  
  // Backend integration
  const { 
    tasks, 
    loading, 
    error, 
    createTask, 
    updateTask, 
    deleteTask, 
    fetchTasks,
    addTaskOptimistically,
    updateTaskOptimistically,
    removeTaskOptimistically 
  } = useTasks(workspaceId);
  
  // Media files for @ tagging
  const { media: mediaFiles } = useMedia(workspaceId);
  
  // Permission checks with refetch capability
  const { canCreateTask, loading: permissionsLoading, refetch: refetchPermissions } = useRoleBasedUI(workspaceId);

  // Use shared WebSocket connection for real-time updates
  const { subscribe } = useWebSocket();

  // Subscribe to WebSocket messages for real-time task updates
  useEffect(() => {
    const unsubscribe = subscribe((msg) => {
      console.log('TasksSection received WebSocket message:', msg);
      
      // Handle task-related events for instant UI updates
      if (msg.type === 'task_created' && msg.task) {
        // Immediately add the new task to the list for instant feedback
        console.log('Task created via WebSocket - adding to state immediately:', msg.task);
        addTaskOptimistically(msg.task);
      } else if (msg.type === 'task_updated' && msg.task_id && msg.task) {
        // Use optimistic update instead of full refetch for better performance
        console.log('Task updated via WebSocket - updating state immediately:', msg.task);
        updateTaskOptimistically(msg.task_id, msg.task);
      } else if (msg.type === 'task_deleted' && msg.task_id) {
        // Immediately remove from state for instant feedback  
        console.log('Task deleted via WebSocket - removing from state immediately:', msg.task_id);
        removeTaskOptimistically(msg.task_id);
      } else if (msg.type === 'member_role_changed' && msg.user_id === currentUser?.id) {
        console.log('User role changed, refreshing permissions...');
        // Refresh permissions when current user's role changes
        refetchPermissions();
      } else if (msg.type === 'reaction_added' && msg.reaction) {
        // Handle instant reaction updates
        console.log('Reaction added via WebSocket - updating reactions immediately:', msg.reaction);
        // This will be handled by individual TaskCard components that have reaction hooks
      } else if (msg.type === 'reaction_removed' && msg.reaction) {
        // Handle instant reaction removal
        console.log('Reaction removed via WebSocket - updating reactions immediately:', msg.reaction);
        // This will be handled by individual TaskCard components that have reaction hooks
      } else if (msg.type === 'comment_added' && msg.comment) {
        // Handle instant comment updates
        console.log('Comment added via WebSocket - comment will be updated by CommentSection');
        // CommentSection handles this with its own WebSocket subscription
      }
    });

    return unsubscribe;
  }, [subscribe, refetchPermissions, currentUser?.id, addTaskOptimistically, updateTaskOptimistically, removeTaskOptimistically]);

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

  // Deduplicate tasks by id before rendering
  const uniqueTasks = Array.from(new Map(tasks.map(t => [t.id, t])).values());

  // Filter tasks by selected member (using same logic as drafts system)
  const filteredTasks = filterMember === 'all'
    ? uniqueTasks
    : uniqueTasks.filter(t => t.assigned_to && (t.assigned_to.id === filterMember || t.assigned_to.name === filterMember));

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
      {/* Member filter dropdown (same as drafts system) */}
      <div className="mb-4">
        <label className="mr-2 font-medium text-gray-700">Filter by member:</label>
        <select
          className="border rounded px-2 py-1 text-gray-700"
          value={filterMember}
          onChange={e => setFilterMember(e.target.value)}
        >
          <option value="all">All</option>
          {teamMembers && teamMembers.map(member => (
            <option key={member.id || member.name} value={member.id || member.name}>{member.name}</option>
          ))}
        </select>
      </div>

      {/* Only show Add Task button if user has permission to create tasks */}
      {canCreateTask && (
        <div className="mb-6">
          <button
            className="py-2 px-6 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-semibold flex items-center gap-2"
            onClick={handleOpenModal}
          >
            <FaPlus className="text-base" /> Add Task
          </button>
        </div>
      )}
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
          mediaFiles={mediaFiles}
          initialData={editingTask}
        />
      </Modal>
      {/* Task List Grid - Mobile responsive and compact */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filteredTasks.map((task) => {
          console.log('TasksSection rendering task:', {
            id: task.id,
            title: task.title,
            last_updated_by_name: task.last_updated_by_name,
            creator_name: task.creator_name,
            updated_at: task.updated_at
          });
          return (
            <TaskCard
              key={task.id}
              task={task}
              onUpdate={updateTask}
              onDelete={handleDeleteTask}
              workspaceId={workspaceId}
              teamMembers={teamMembers}
              mediaFiles={mediaFiles}
            />
          );
        })}
      </div>
    </section>
  );
}