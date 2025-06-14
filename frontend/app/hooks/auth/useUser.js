'use client';
import { useState, useEffect } from 'react';

export const useUser = () => {
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          console.warn('No access token found');
          setIsLoading(false);
          return;
        }

        const res = await fetch('http://localhost:8080/api/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch profile');
        }

        const data = await res.json();
        setProfileData(data);
      } catch (err) {
        console.error('Error in useUser:', err);
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
  };
};
