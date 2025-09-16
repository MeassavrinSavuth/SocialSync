import { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:8080/api';

export function useMedia(workspaceId) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [uploadStartTime, setUploadStartTime] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      return token;
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
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded * 100) / event.total);
          setUploadProgress(progress);
          
          // Calculate upload speed
          if (uploadStartTime) {
            const elapsed = (Date.now() - uploadStartTime) / 1000; // seconds
            const speed = event.loaded / elapsed; // bytes per second
            setUploadSpeed(speed);
          }
        }
      };
      
      // Handle upload start
      xhr.onloadstart = () => {
        setIsUploading(true);
        setUploadProgress(0);
        setUploadSpeed(0);
        setUploadStartTime(Date.now());
        setError(null);
        setUploadSuccess(false);
        setUploadError(null);
      };
      
      // Handle upload completion
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const newMedia = JSON.parse(xhr.responseText);
            // Show success state briefly
            setUploadSuccess(true);
            setUploadProgress(100);
            
            setTimeout(() => {
              setIsUploading(false);
              setUploadProgress(0);
              setUploadSpeed(0);
              setUploadStartTime(null);
              setUploadSuccess(false);
            }, 1500); // Show success for 1.5 seconds
            
            // WebSocket will handle the real-time update, but we can also update locally for immediate feedback
            setMedia(prev => {
              const filtered = prev.filter(m => m.id !== newMedia.id);
              return [newMedia, ...filtered];
            });
            setTotal(prev => prev + 1);
            resolve(newMedia);
          } catch (error) {
            setIsUploading(false);
            setUploadError('Failed to parse server response');
            setUploadProgress(0);
            setUploadSpeed(0);
            setUploadStartTime(null);
            reject(new Error('Failed to parse response'));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            const errorMessage = errorData.message || 'Failed to upload media';
            setIsUploading(false);
            setUploadError(errorMessage);
            setUploadProgress(0);
            setUploadSpeed(0);
            setUploadStartTime(null);
            reject(new Error(errorMessage));
          } catch (error) {
            const errorMessage = `Failed to upload media. Status: ${xhr.status}`;
            setIsUploading(false);
            setUploadError(errorMessage);
            setUploadProgress(0);
            setUploadSpeed(0);
            setUploadStartTime(null);
            reject(new Error(errorMessage));
          }
        }
      };
      
      // Handle upload error
      xhr.onerror = () => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadSpeed(0);
        setUploadStartTime(null);
        setUploadError('Upload failed due to network error');
        reject(new Error('Upload failed due to network error'));
      };
      
      // Handle upload abort
      xhr.onabort = () => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadSpeed(0);
        setUploadStartTime(null);
        setUploadError('Upload was cancelled');
        reject(new Error('Upload was cancelled'));
      };
      
      // Start the upload
      xhr.open('POST', `${API_BASE_URL}/workspaces/${workspaceId}/media`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  };

  const deleteMedia = async (mediaId) => {
    if (!workspaceId) throw new Error('Workspace ID is required');
    if (!mediaId) throw new Error('Media ID is required');
    
    try {
      const token = getAuthToken();
      
      // Log the request details for debugging (remove in production)
      console.log('Delete request details:', {
        url: `${API_BASE_URL}/workspaces/${workspaceId}/media/${mediaId}`,
        workspaceId,
        mediaId,
        tokenExists: !!token
      });

      // Log the request details for debugging (remove in production)
      console.log('Delete request details:', {
        url: `${API_BASE_URL}/workspaces/${workspaceId}/media/${mediaId}`,
        workspaceId,
        mediaId,
        tokenExists: !!token
      });

      const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/media/${mediaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        // Try to get detailed error message from response
        const errorData = await response.json().catch(() => ({ 
          message: `HTTP error! status: ${response.status}`,
          details: response.statusText 
        }));
        
        // Log the error details for debugging
        console.error('Delete media error details:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });

        // Handle specific status codes
        if (response.status === 403) {
          throw new Error('You do not have permission to delete this media. Please check your login status.');
        } else if (response.status === 401) {
          // Force re-login if token is invalid
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
          throw new Error('Your session has expired. Please log in again.');
        }
        
        throw new Error(errorData.message || `Failed to delete media. Status: ${response.status}`);
      }
      
      // Only update state if delete was successful
      setMedia(prev => prev.filter(m => m.id !== mediaId));
      setTotal(prev => Math.max(0, prev - 1));
      
      return true; // Indicate success
    } catch (error) {
      console.error('Delete media error:', error);
      throw new Error(error.message || 'Failed to delete media');
    }
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
              // Remove any existing media with the same id before adding
              const filtered = prev.filter(m => m.id !== msg.media.id);
              return [msg.media, ...filtered];
            });
            setTotal(prev => prev + 1);
          } else if (msg.type === 'media_deleted' && msg.mediaId) {
            setMedia(prev => prev.filter(m => m.id !== msg.mediaId));
            setTotal(prev => Math.max(0, prev - 1));
          } else if (msg.type === 'media_updated' && msg.media) {
            setMedia(prev => prev.map(m => 
              m.id === msg.media.id ? { ...m, ...msg.media } : m
            ));
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
    uploadProgress,
    isUploading,
    uploadSpeed,
    uploadSuccess,
    uploadError,
    fetchMedia,
    uploadMedia,
    deleteMedia,
    updateMediaTags,
  };
} 