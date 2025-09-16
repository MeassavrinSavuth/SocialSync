import { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export function useDraftPosts(workspaceId) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getAuthToken = () => (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/drafts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setDrafts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createDraft = async (data) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/drafts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    if (res.ok) fetchDrafts();
    return res.ok;
  };

  const updateDraft = async (draftId, data) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/drafts/${draftId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    if (res.ok) fetchDrafts();
    return res.ok;
  };

  const deleteDraft = async (draftId) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/drafts/${draftId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) fetchDrafts();
    return res.ok;
  };

  const publishDraft = async (draftId) => {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/drafts/${draftId}/publish`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) fetchDrafts();
    return res.ok;
  };

  useEffect(() => {
    if (workspaceId) {
      fetchDrafts();
      const wsUrl = API_BASE_URL.replace(/^http/, 'ws').replace(/^https/, 'wss');
      const ws = new window.WebSocket(`${wsUrl}/ws/${workspaceId}`);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'draft_created' && msg.draft) {
            setDrafts(prev => [msg.draft, ...prev.filter(d => d.id !== msg.draft.id)]);
          } else if ((msg.type === 'draft_updated' || msg.type === 'draft_published') && msg.draft) {
            fetchDrafts(); // Refetch for update/publish
          } else if (msg.type === 'draft_deleted' && msg.draftId) {
            setDrafts(prev => prev.filter(d => d.id !== msg.draftId));
          }
        } catch (e) { /* ignore */ }
      };
      return () => ws.close();
    }
  }, [workspaceId]);

  return { drafts, loading, error, fetchDrafts, createDraft, updateDraft, deleteDraft, publishDraft };
} 