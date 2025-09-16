import { useState, useEffect } from 'react';
import { useUser } from '../auth/useUser';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export const useInvitations = () => {
  const [invitations, setInvitations] = useState([]);
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

  // Fetch all pending invitations
  const fetchInvitations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      console.log('Fetching invitations with token:', token ? 'present' : 'missing');
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${API_BASE_URL}/api/invitations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('Invitations response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched invitations:', data);
      setInvitations(Array.isArray(data) ? data : []);
    } catch (err) {
      let errorMessage = 'Failed to fetch invitations';
      
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (err.message === 'Failed to fetch') {
        errorMessage = 'Network error. Please check if the backend server is running.';
      } else {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error('Error fetching invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Send invitation to join workspace
  const sendInvitation = async (workspaceId, email, role = 'Editor') => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email, role }),
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        // Try to get more specific error message from response body
        try {
          const errorData = await response.json();
          console.log('Error response data:', errorData); // Debug log
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          console.log('Could not parse error response as JSON:', parseError); // Debug log
          // If we can't parse JSON, use status-specific messages
          switch (response.status) {
            case 409:
              errorMessage = 'This user is already a member or has already been invited to this workspace.';
              break;
            case 403:
              errorMessage = 'You do not have permission to invite members to this workspace.';
              break;
            case 400:
              errorMessage = 'Invalid request. Please check the email and role.';
              break;
            default:
              errorMessage = `Failed to send invitation (${response.status})`;
          }
        }
        
        console.log('Final error message:', errorMessage); // Debug log
        throw new Error(errorMessage);
      }

      const invitation = await response.json();
      return invitation;
    } catch (err) {
      setError(err.message);
      console.error('Error sending invitation:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Accept invitation
  const acceptInvitation = async (invitationId) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/invitations/${invitationId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Remove the accepted invitation from the list
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));

      // Reload the page to show the new workspace
      window.location.reload();

      return await response.json();
    } catch (err) {
      setError(err.message);
      console.error('Error accepting invitation:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Decline invitation
  const declineInvitation = async (invitationId) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/invitations/${invitationId}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Remove the declined invitation from the list
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      
      return await response.json();
    } catch (err) {
      setError(err.message);
      console.error('Error declining invitation:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load invitations on mount and when user changes
  useEffect(() => {
    if (currentUser && currentUser.email) {
      fetchInvitations();
    }
  }, [currentUser?.email]);

  // Real-time WebSocket for invitations
  useEffect(() => {
    if (!currentUser?.email) return;
    const wsUrl = API_BASE_URL.replace(/^http/, 'ws');
    const ws = new window.WebSocket(`${wsUrl}/ws/invitations/${encodeURIComponent(currentUser.email)}`);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'invitation_created') {
          fetchInvitations();
        }
      } catch (e) { /* ignore */ }
    };
    return () => ws.close();
  }, [currentUser?.email]);

  return {
    invitations,
    loading,
    error,
    fetchInvitations,
    sendInvitation,
    acceptInvitation,
    declineInvitation,
  };
}; 