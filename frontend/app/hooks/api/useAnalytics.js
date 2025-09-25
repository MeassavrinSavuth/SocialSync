import { useState, useEffect } from 'react';
import { useProtectedFetch } from '../auth/useProtectedFetch';

export function useAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const protectedFetch = useProtectedFetch();

  const fetchAnalytics = async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (filters.platforms && filters.platforms.length > 0) {
        filters.platforms.forEach(platform => params.append('platform', platform));
      }
      if (filters.startDate) {
        params.append('start_date', filters.startDate);
      }
      if (filters.endDate) {
        params.append('end_date', filters.endDate);
      }
      if (filters.limit) {
        params.append('limit', filters.limit);
      }

      const queryString = params.toString();
      const endpoint = queryString ? `/analytics/overview?${queryString}` : '/analytics/overview';
      
      const res = await protectedFetch(endpoint);
      
      if (!res) {
        setError('Failed to fetch analytics data - please check your connection');
        return;
      }

      if (res.error) {
        if (res.status === 401) {
          setError('Please log in to view analytics data');
        } else {
          setError(res.error);
        }
        return;
      }

      setAnalytics(res.data);
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError('Network error - please check your connection');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlatformComparison = async () => {
    try {
      const res = await protectedFetch('/analytics/platforms');
      
      if (!res) {
        throw new Error('Failed to fetch platform comparison data');
      }

      if (res.error) {
        throw new Error(res.error);
      }

      return res.data;
    } catch (err) {
      console.error('Error fetching platform comparison:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return {
    analytics,
    loading,
    error,
    fetchAnalytics,
    fetchPlatformComparison,
    refetch: () => fetchAnalytics()
  };
}