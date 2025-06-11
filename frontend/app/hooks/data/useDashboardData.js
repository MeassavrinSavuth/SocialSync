import { useState, useEffect } from 'react';
import { useProtectedFetch } from '../auth/useProtectedFetch';

export const useDashboardData = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const protectedFetch = useProtectedFetch();

  useEffect(() => {
    const fetchDashboard = async () => {
      const res = await protectedFetch('/api/dashboard');
      if (!res) return;

      const data = await res.text(); // or res.json()
      setDashboardData(data);
      setLoading(false);
    };

    fetchDashboard();
  }, [protectedFetch]);

  return { loading, dashboardData };
};
