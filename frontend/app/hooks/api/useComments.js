import { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export const useComments = (workspaceId, taskId) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get access token from localStorage
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  };

  const fetchComments = async () => {
    if (!workspaceId || !taskId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/tasks/${taskId}/comments`, {
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
      setComments(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (content) => {
    if (!workspaceId || !taskId) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newComment = await response.json();
      setComments(prev => [...prev, newComment]);
      return newComment;
    } catch (err) {
      setError(err.message);
      console.error('Error adding comment:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteComment = async (commentId) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/tasks/${taskId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setComments(prev => prev.filter(comment => comment.id !== commentId));
      return true;
    } catch (err) {
      setError(err.message);
      console.error('Error deleting comment:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [workspaceId, taskId]);

  return {
    comments,
    loading,
    error,
    fetchComments,
    addComment,
    deleteComment,
  };
}; 