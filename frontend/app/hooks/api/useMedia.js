import { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:8080/api';

export function useMedia(workspaceId) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  };

  const fetchMedia = async (filters = {}) => {
    if (!workspaceId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.search) params.append('search', filters.search);
      if (filters.tag) params.append('tag', filters.tag);
      
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/media?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setMedia(Array.isArray(data.media) ? data.media : []);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching media:', err);
    } finally {
      setLoading(false);
    }
  };

  const uploadMedia = async (file, tags = []) => {
    if (!workspaceId) throw new Error('Workspace ID is required');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tags', JSON.stringify(tags));
    
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to upload media');
    }
    
    const newMedia = await response.json();
    // Don't add media here - it will be added via WebSocket broadcast
    // setMedia(prev => [newMedia, ...prev]);
    // setTotal(prev => prev + 1);
    
    return newMedia;
  };

  const deleteMedia = async (mediaId) => {
    if (!workspaceId) throw new Error('Workspace ID is required');
    
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/media/${mediaId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to delete media');
    }
    
    setMedia(prev => prev.filter(m => m.id !== mediaId));
    setTotal(prev => prev - 1);
  };

  const updateMediaTags = async (mediaId, tags) => {
    if (!workspaceId) throw new Error('Workspace ID is required');
    
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/media/${mediaId}/tags`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ tags }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to update media tags');
    }
    
    setMedia(prev => prev.map(m => 
      m.id === mediaId ? { ...m, tags } : m
    ));
  };

  useEffect(() => {
    if (workspaceId) {
      fetchMedia();
      const ws = new window.WebSocket(`ws://localhost:8080/ws/${workspaceId}`);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'media_uploaded' && msg.media) {
            setMedia(prev => {
              // Check if media already exists to avoid duplicates
              const exists = prev.some(m => m.id === msg.media.id);
              if (exists) {
                return prev; // Don't add if it already exists
              }
              // Increment total count only when actually adding new media
              setTotal(prevTotal => prevTotal + 1);
              return [msg.media, ...prev];
            });
          }
        } catch (e) { /* ignore */ }
      };
      return () => ws.close();
    }
  }, [workspaceId]);

  return {
    media,
    loading,
    error,
    total,
    fetchMedia,
    uploadMedia,
    deleteMedia,
    updateMediaTags,
  };
} 