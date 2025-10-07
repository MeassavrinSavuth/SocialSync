import { useState, useEffect } from 'react';
import { useUser } from '../auth/useUser';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://socialsync-j7ih.onrender.com';

export const useWorkspaceMembers = (workspaceId) => {
  const [members, setMembers] = useState([]);
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

  const fetchMembers = async () => {
    if (!workspaceId) return;
    
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/members`, {
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
      setMembers(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  };

  const leaveWorkspace = async () => {
    if (!workspaceId) return;
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to leave workspace');
      }

      // Redirect to dashboard after leaving
      window.location.href = '/home/workspace';
      return true;
    } catch (err) {
      console.error('Error leaving workspace:', err);
      throw err;
    }
  };

  const removeMember = async (memberId) => {
    if (!workspaceId || !memberId) return;
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to remove member');
      }

      // Refresh the member list
      await fetchMembers();
      return true;
    } catch (err) {
      console.error('Error removing member:', err);
      throw err;
    }
  };

  const changeMemberRole = async (memberId, newRole) => {
    if (!workspaceId || !memberId) return;
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/members/${memberId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to change member role');
      }
      await fetchMembers();
      return true;
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [workspaceId]);

  // Note: Real-time updates are now handled by the shared WebSocket context
  // in the components that use this hook, rather than creating individual connections

  return {
    members,
    loading,
    error,
    refetch: fetchMembers,
    leaveWorkspace,
    removeMember,
    changeMemberRole,
  };
}; // Build fix: Wed Sep 17 01:32:56 +07 2025
