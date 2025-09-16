import { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api';

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

  const fetchTasks = async () => {
    if (!workspaceId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/tasks`, {
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
      setTasks(tasksWithDefaults);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (taskData) => {
    if (!workspaceId) return null;
    
    setLoading(true);
    setError(null);
    
    try {
  
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/tasks`, {
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
      const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/tasks/${taskId}`, {
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

      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      ));
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
      const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/tasks/${taskId}`, {
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
    if (!workspaceId) return;
    const wsUrl = API_BASE_URL.replace(/^http/, 'ws').replace(/^https/, 'wss').replace('/api', '');
    const ws = new window.WebSocket(`${wsUrl}/ws/${workspaceId}`);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'task_created' && msg.task) {
          setTasks(prev => {
            const exists = prev.some(t => t.id === msg.task.id);
            if (exists) {
              // Replace the existing task
              return prev.map(t => t.id === msg.task.id ? msg.task : t);
            } else {
              // Add new task to the top
              return [msg.task, ...prev];
            }
          });
        } else if (msg.type === 'task_updated' && msg.task_id) {
          fetchTasks(); // For simplicity, refetch all tasks on update
        } else if (msg.type === 'task_deleted' && msg.task_id) {
          setTasks(prev => prev.filter(t => t.id !== msg.task_id));
        }
      } catch (e) { /* ignore */ }
    };
    return () => ws.close();
  }, [workspaceId]);

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