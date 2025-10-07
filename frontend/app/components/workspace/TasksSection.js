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
    removeTaskOptimistically 
  } = useTasks(workspaceId);
  
  // Media files for @ tagging
  const { media: mediaFiles } = useMedia(workspaceId);
  
  // Permission checks
  const { canCreateTask, loading: permissionsLoading } = useRoleBasedUI(workspaceId);

  // Use shared WebSocket connection for real-time updates
  const { subscribe } = useWebSocket();

  // Subscribe to WebSocket messages for real-time task updates
  useEffect(() => {
    const unsubscribe = subscribe((msg) => {
      console.log('TasksSection received WebSocket message:', msg);
      
      if (msg.type === 'task_created' && msg.task) {
        // Immediately add the new task to the list for instant feedback
        console.log('Task created via WebSocket - adding to state immediately:', msg.task);
        addTaskOptimistically(msg.task);
      } else if (msg.type === 'task_updated' && msg.task_id) {
        // For updates, we still need to fetch to get complete updated data including last_updated_by
        console.log('Task updated via WebSocket - fetching latest data...');
        fetchTasks();
      } else if (msg.type === 'task_deleted' && msg.task_id) {
        // Immediately remove from state for instant feedback  
        console.log('Task deleted via WebSocket - removing from state immediately:', msg.task_id);
        removeTaskOptimistically(msg.task_id);
      }
    });

    return unsubscribe;
  }, [subscribe, fetchTasks, addTaskOptimistically, removeTaskOptimistically]);

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
        {console.log('Rendering Modal with showModal:', showModal)}
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