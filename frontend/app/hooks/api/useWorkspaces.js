import { useState, useEffect } from 'react';
import { useUser } from '../auth/useUser';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://socialsync-j7ih.onrender.com';

export const useWorkspaces = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { profileData: currentUser } = useUser();

  // Get access token from localStorage
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  };

  // Fetch all workspaces
  const fetchWorkspaces = async () => {
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
  };

  // Create a new workspace
  const createWorkspace = async (workspaceData) => {
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
      setWorkspaces(prev => [newWorkspace, ...(Array.isArray(prev) ? prev : [])]);
      return newWorkspace;
    } catch (err) {
      setError(err.message);
      console.error('Error creating workspace:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete a workspace
  const deleteWorkspace = async (workspaceId) => {
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
      setWorkspaces(prev => prev.filter(ws => ws.id !== workspaceId));
      return true;
    } catch (err) {
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

  // Note: Real-time updates are now handled by the shared WebSocket context
  // in the components that use this hook, rather than creating individual connections

  return {
    workspaces,
    loading,
    error,
    fetchWorkspaces,
    createWorkspace,
    deleteWorkspace,
  };
}; 