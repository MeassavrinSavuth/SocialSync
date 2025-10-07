import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  
  // Backend integration
  const { tasks, loading, error, createTask, updateTask, deleteTask, fetchTasks, addTaskOptimistically, updateTaskOptimistically, removeTaskOptimistically } = useTasks(workspaceId);
  
  // Media files for @ tagging
  const { media: mediaFiles } = useMedia(workspaceId);
  
  // Permission checks
  const { canCreate, canUpdateTask, canDeleteTask, loading: permissionsLoading, refetch: refetchPermissions } = useRoleBasedUI(workspaceId);
  
  // Debug logging for permissions
  useEffect(() => {
    console.log('TasksSection permissions:', { canCreate, canUpdateTask, canDeleteTask, permissionsLoading });
  }, [canCreate, canUpdateTask, canDeleteTask, permissionsLoading]);

  // Use shared WebSocket connection for real-time updates
  const { subscribe } = useWebSocket();

  // Subscribe to WebSocket messages for real-time task updates (in-place updates like drafts)
  useEffect(() => {
    const fallbackTimer = { id: null };
    const maybeFallbackRefresh = () => {
      if (fallbackTimer.id) clearTimeout(fallbackTimer.id);
      // small debounce in case of multiple quick events without payloads
      fallbackTimer.id = setTimeout(() => {
        fetchTasks();
      }, 150);
    };

    const unsubscribe = subscribe((msg) => {
      if (!msg || !msg.type) return;

      // Normalize task shape to include defaults used by UI
      const normalizeTask = (t) => {
        if (!t || typeof t !== 'object') return t;
        return {
          reactions: { thumbsUp: 0, fire: 0, thumbsDown: 0, ...(t.reactions || {}) },
          comments: t.comments || [],
          ...t,
        };
      };

  if (msg.type === 'task_created' && msg.task) {
        const t = normalizeTask(msg.task);
        // avoid duplicates
        const exists = tasks.some((x) => x.id === t.id);
        if (!exists) addTaskOptimistically(t);
        else updateTaskOptimistically(t.id, t);
        return;
      }

      if (msg.type === 'task_updated') {
        if (msg.task) {
          const t = normalizeTask(msg.task);
          updateTaskOptimistically(t.id, t);
        } else if (msg.task_id) {
          // Payload missing full task, do a light fallback refresh
          maybeFallbackRefresh();
        }
        return;
      }

      if (msg.type === 'task_deleted' && msg.task_id) {
        removeTaskOptimistically(msg.task_id);
        return;
      }

      if (msg.type === 'task_reaction_changed' && msg.task_id && msg.reactions) {
        updateTaskOptimistically(msg.task_id, {
          reactions: {
            thumbsUp: 0,
            fire: 0,
            thumbsDown: 0,
            ...msg.reactions,
          },
        });
        return;
      }

      // If any member role changes in this workspace, refresh permissions
      if (msg.type === 'member_role_changed') {
        // Debounce permission refresh to prevent rapid successive calls
        setTimeout(() => {
          refetchPermissions(true); // Force refresh permissions
        }, 50);
        return;
      }
    });

    return () => {
      if (fallbackTimer.id) clearTimeout(fallbackTimer.id);
      unsubscribe();
    };
  }, [subscribe, fetchTasks, refetchPermissions, currentUser, tasks, addTaskOptimistically, updateTaskOptimistically, removeTaskOptimistically]);

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
  const uniqueTasks = useMemo(() => Array.from(new Map(tasks.map(t => [t.id, t])).values()), [tasks]);

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
      {/* Only show Add Task button if user has permission to create tasks */}
      {canCreate && (
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
        {uniqueTasks.map((task) => {
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