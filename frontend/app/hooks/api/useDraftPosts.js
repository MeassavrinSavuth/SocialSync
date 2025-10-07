import { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://socialsync-j7ih.onrender.com';

export function useDraftPosts(workspaceId) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getAuthToken = () => (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/drafts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      setDrafts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching drafts:', err);
    } finally {
      setLoading(false);
    }
  };

  const createDraft = async (data) => {
    const token = getAuthToken();
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        fetchDrafts();
      } else {
        const errorText = await res.text();
        console.error('Create draft failed:', res.status, errorText);
      }
      return res.ok;
    } catch (error) {
      console.error('Create draft error:', error);
      return false;
    }
  };

  const updateDraft = async (draftId, data) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/drafts/${draftId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    if (res.ok) fetchDrafts();
    return res.ok;
  };

  const deleteDraft = async (draftId) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/drafts/${draftId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) fetchDrafts();
    return res.ok;
  };

  const publishDraft = async (draftId) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/drafts/${draftId}/publish`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) fetchDrafts();
    return res.ok;
  };

  useEffect(() => {
    if (workspaceId) {
      fetchDrafts();
    }
  }, [workspaceId]);

  return { drafts, loading, error, fetchDrafts, createDraft, updateDraft, deleteDraft, publishDraft };
} 