import { useState, useEffect } from 'react';
import { useUser } from '../auth/useUser';

const API_BASE_URL = 'http://localhost:8080/api';

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
      
      const response = await fetch(`${API_BASE_URL}/invitations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Invitations response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched invitations:', data);
      setInvitations(data);
    } catch (err) {
      setError(err.message);
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
      const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/invite`, {
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
      const response = await fetch(`${API_BASE_URL}/invitations/${invitationId}/accept`, {
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
      const response = await fetch(`${API_BASE_URL}/invitations/${invitationId}/decline`, {
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
      console.log('Fetching invitations for user:', currentUser.email);
      fetchInvitations();
    }
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