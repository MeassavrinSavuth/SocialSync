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
      console.log('Fetched tasks data:', data);
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
    if (!workspaceId) return null;
    
    setLoading(true);
    setError(null);
    
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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newTask = await response.json();
      newTask.reactions = newTask.reactions || { thumbsUp: 0, fire: 0, thumbsDown: 0 };
      newTask.comments = newTask.comments || [];
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    } catch (err) {
      setError(err.message);
      console.error('Error creating task:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async (taskId, updates) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      console.log('Sending task update:', { taskId, updates, token: token ? 'present' : 'missing' });
      const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Force refresh the tasks to get updated data including last_updated_by
      console.log('Status update completed, refreshing tasks...');
      fetchTasks();
      return true;
    } catch (err) {
      setError(err.message);
      console.error('Error updating task:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (taskId) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setTasks(prev => prev.filter(task => task.id !== taskId));
      return true;
    } catch (err) {
      setError(err.message);
      console.error('Error deleting task:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [workspaceId, fetchTasks]);

  // Note: Real-time updates are now handled by the shared WebSocket context
  // in the components that use this hook, rather than creating individual connections

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
  };
}; 