'use client';
import { useState, useEffect } from 'react';

export const useUser = () => {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://socialsync-j7ih.onrender.com';
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null); // Optional: for debugging

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Wait until window is defined to safely access localStorage
        if (typeof window === 'undefined') return;

        const token = localStorage.getItem('accessToken');
        if (!token) {
          console.warn('No access token found in localStorage');
          setIsLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE_URL}/api/profile`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          console.warn('Access token is invalid or expired');
          setError('Unauthorized');
          // Optionally: clear tokens, redirect to login, etc.
          setIsLoading(false);
          return;
        }

        if (!res.ok) {
          throw new Error(`Failed to fetch profile: ${res.status}`);
        }

        const data = await res.json();
        setProfileData(data);
      } catch (err) {
        console.error('Error in useUser:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return {
    profileData,
    setProfileData,
    isLoading,
    error, // Optional: for showing errors in UI
  };
};
