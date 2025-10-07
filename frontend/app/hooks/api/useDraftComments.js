import { useEffect, useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://socialsync-j7ih.onrender.com';

export function useDraftComments(workspaceId, draftId) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null);

  const fetchComments = async () => {
    if (!workspaceId || !draftId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/drafts/${draftId}/comments`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // De-duplicate by id
      const unique = [];
      const seen = new Set();
      (Array.isArray(data) ? data : []).forEach(c => {
        if (c && c.id && !seen.has(c.id)) { seen.add(c.id); unique.push(c); }
      });
      setComments(unique);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (content) => {
    if (!workspaceId || !draftId) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/drafts/${draftId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) return false;
      const newComment = await res.json();
      setComments(prev => (prev.some(c => c.id === newComment.id) ? prev : [...prev, newComment]));
      return true;
    } catch {
      return false;
    }
  };

  const deleteComment = async (commentId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/drafts/${draftId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      if (!res.ok) return false;
      setComments(prev => prev.filter(c => c.id !== commentId));
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    fetchComments();
  }, [workspaceId, draftId]);

  return { comments, loading, error, fetchComments, addComment, deleteComment };
}


