import { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://socialsync-j7ih.onrender.com';

export function useSocialAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/social-accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching social accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get account name by ID
  const getAccountName = (accountId) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (account) {
      return account.displayName || account.profileName || account.provider || 'Unknown Account';
    }
    return 'Unknown Account';
  };

  // Get account info by ID
  const getAccountInfo = (accountId) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (account) {
      return {
        name: account.displayName || account.profileName || account.provider || 'Unknown Account',
        provider: account.provider || account.platform,
        avatar: account.avatar || account.profilePictureUrl,
        isDefault: account.isDefault || false
      };
    }
    return {
      name: 'Unknown Account',
      provider: 'unknown',
      avatar: null,
      isDefault: false
    };
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  return {
    accounts,
    loading,
    error,
    fetchAccounts,
    getAccountName,
    getAccountInfo
  };
}
