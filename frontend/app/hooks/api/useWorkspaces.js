import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../auth/useUser';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://socialsync-j7ih.onrender.com';

export const useWorkspaces = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { profileData: currentUser } = useUser();

  // Optimistic update functions for instant UI feedback
  const addWorkspaceOptimistically = useCallback((newWorkspace) => {
    setWorkspaces(prev => [newWorkspace, ...(Array.isArray(prev) ? prev : [])]);
  }, []);

  const removeWorkspaceOptimistically = useCallback((workspaceId) => {
    setWorkspaces(prev => prev.filter(ws => ws.id !== workspaceId));
  }, []);

  // WebSocket event handlers for real-time updates (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return; // Skip on server-side
    
    // Dynamic import of WebSocket context to avoid SSR issues
    const setupWebSocket = async () => {
      try {
        const { useWebSocket } = await import('../../contexts/WebSocketContext');
        // Note: This is just for demonstration - in practice we'd need to restructure
        // the component to use the WebSocket context properly
      } catch (error) {
        console.log('WebSocket context not available during build');
      }
    };

    setupWebSocket();
  }, [addWorkspaceOptimistically, removeWorkspaceOptimistically]);

  // Get access token from localStorage
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  };

  // Fetch all workspaces
  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/workspaces`, {
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
      setWorkspaces(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching workspaces:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new workspace with optimistic updates
  const createWorkspace = async (workspaceData) => {
    // Generate temporary ID for optimistic update
    const tempId = Date.now().toString();
    const optimisticWorkspace = {
      id: tempId,
      ...workspaceData,
      created_at: new Date().toISOString(),
      owner_id: currentUser?.id,
    };

    // Add optimistically for instant UI feedback
    addWorkspaceOptimistically(optimisticWorkspace);
    
    setLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/workspaces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(workspaceData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newWorkspace = await response.json();
      
      // Replace optimistic workspace with real one
      setWorkspaces(prev => prev.map(ws => 
        ws.id === tempId ? newWorkspace : ws
      ));
      
      return newWorkspace;
    } catch (err) {
      // Remove optimistic workspace on error
      removeWorkspaceOptimistically(tempId);
      setError(err.message);
      console.error('Error creating workspace:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete a workspace with optimistic updates
  const deleteWorkspace = async (workspaceId) => {
    // Store original workspace for rollback
    const originalWorkspace = workspaces.find(ws => ws.id === workspaceId);
    
    // Remove optimistically for instant UI feedback
    removeWorkspaceOptimistically(workspaceId);
    
    setLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to delete workspace (status: ${response.status})`);
      }
      
      return true;
    } catch (err) {
      // Restore workspace on error
      if (originalWorkspace) {
        addWorkspaceOptimistically(originalWorkspace);
      }
      setError(err.message);
      console.error('Error deleting workspace:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load workspaces on mount
  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  return {
    workspaces,
    loading,
    error,
    fetchWorkspaces,
    createWorkspace,
    deleteWorkspace,
    addWorkspaceOptimistically,
    removeWorkspaceOptimistically,
  };
};
