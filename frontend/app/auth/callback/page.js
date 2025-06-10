'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);

      // Redirect to dashboard or home
      router.push('/dashboard');
    } else {
      // If tokens are missing, redirect to login
      router.push('/login');
    }
  }, []);

  return <p>Logging you in...</p>;
}
