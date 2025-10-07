import { useState, useEffect } from 'react';
import { useProtectedFetch } from '../auth/useProtectedFetch';

export const useDashboardData = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const protectedFetch = useProtectedFetch();
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://socialsync-j7ih.onrender.com';

  useEffect(() => {
    const fetchDashboard = async () => {
      const res = await protectedFetch(`${API_BASE_URL}/api/dashboard`);
      if (!res) return;

      const data = await res.text(); // or res.json()
      setDashboardData(data);
      setLoading(false);
    };

    fetchDashboard();
  }, [protectedFetch, API_BASE_URL]);

  return { loading, dashboardData };
};
