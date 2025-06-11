'use client'; // for App Router
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AuthCallback = () => {
  const router = useRouter();

  useEffect(() => {
    const url = new URL(window.location.href);
    const accessToken = url.searchParams.get('access_token');
    const refreshToken = url.searchParams.get('refresh_token');
    const user = url.searchParams.get('user');

    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      if (user) localStorage.setItem('user', user);
      router.push('/dashboard');
    } else {
      console.error('Access token not found in callback');
      router.push('/login'); // fallback
    }
  }, []);

  return <p className="text-center mt-10">Logging in...</p>;
};

export default AuthCallback;
