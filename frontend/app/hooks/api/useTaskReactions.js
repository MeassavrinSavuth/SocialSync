import { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api';

export const useTaskReactions = (workspaceId, taskId) => {
  const [reactions, setReactions] = useState({});
  const [userReactions, setUserReactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get access token from localStorage
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  };

  const fetchReactions = async () => {
    if (!workspaceId || !taskId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/tasks/${taskId}/reactions`, {
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
      setReactions(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching reactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserReactions = async () => {
    if (!workspaceId || !taskId) return;
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/tasks/${taskId}/reactions/user`, {
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
      setUserReactions(data);
    } catch (err) {
      console.error('Error fetching user reactions:', err);
    }
  };

  const toggleReaction = async (reactionType) => {
    if (!workspaceId || !taskId) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/tasks/${taskId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reaction_type: reactionType }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Update local state based on the action
      if (result.action === 'added') {
        setReactions(prev => ({
          ...prev,
          [reactionType]: (prev[reactionType] || 0) + 1
        }));
        setUserReactions(prev => [...prev, reactionType]);
      } else if (result.action === 'removed') {
        setReactions(prev => ({
          ...prev,
          [reactionType]: Math.max(0, (prev[reactionType] || 1) - 1)
        }));
        setUserReactions(prev => prev.filter(r => r !== reactionType));
      }
      
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error toggling reaction:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId && taskId) {
      fetchReactions();
      fetchUserReactions();
    }
  }, [workspaceId, taskId]);

  return {
    reactions,
    userReactions,
    loading,
    error,
    toggleReaction,
    fetchReactions,
    fetchUserReactions,
  };
}; 