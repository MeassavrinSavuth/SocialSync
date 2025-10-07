import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://socialsync-j7ih.onrender.com';

export const useTasks = (workspaceId) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get access token from localStorage
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  };

  const fetchTasks = useCallback(async () => {
    if (!workspaceId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/tasks`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const tasksWithDefaults = data.map(task => ({
        ...task,
        reactions: task.reactions || { thumbsUp: 0, fire: 0, thumbsDown: 0 },
        comments: task.comments || []
      }));
      console.log('Tasks with last_updated_by info:', tasksWithDefaults.map(t => ({
        id: t.id,
        title: t.title,
        last_updated_by_name: t.last_updated_by_name,
        last_updated_by_avatar: t.last_updated_by_avatar,
        updated_at: t.updated_at
      })));
      setTasks(tasksWithDefaults);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const createTask = async (taskData) => {
    if (!workspaceId) return false;
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(taskData),
      });

      if (response.ok) {
        // Don't update state here - WebSocket will handle the real-time update
        console.log('Task created successfully - WebSocket will update the UI');
      } else {
        const errorText = await response.text();
        console.error('Create task failed:', response.status, errorText);
      }
      return response.ok;
    } catch (error) {
      console.error('Create task error:', error);
      return false;
    }
  };

  const updateTask = async (taskId, updates) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        // Don't update state here - WebSocket will handle the real-time update  
        console.log('Task updated successfully - WebSocket will update the UI');
      } else {
        const errorText = await response.text();
        console.error('Update task failed:', response.status, errorText);
      }
      return response.ok;
    } catch (error) {
      console.error('Update task error:', error);
      return false;
    }
  };

    const deleteTask = async (taskId) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Don't update state here - WebSocket will handle the real-time update
        console.log('Task deleted successfully - WebSocket will update the UI');
      } else {
        const errorText = await response.text();
        console.error('Delete task failed:', response.status, errorText);
      }
      return response.ok;
    } catch (error) {
      console.error('Delete task error:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [workspaceId, fetchTasks]);

  // Optimistic updates for better performance
  const addTaskOptimistically = useCallback((newTask) => {
    setTasks(prev => [newTask, ...prev]);
  }, []);

  const updateTaskOptimistically = useCallback((taskId, updatedTask) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updatedTask } : task
    ));
  }, []);

  const removeTaskOptimistically = useCallback((taskId) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  }, []);

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    addTaskOptimistically,
    updateTaskOptimistically,
    removeTaskOptimistically,
    setTasks,
  };
}; 