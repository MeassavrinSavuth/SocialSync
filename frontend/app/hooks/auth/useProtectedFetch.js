import { useRouter } from 'next/navigation';

export const useProtectedFetch = () => {
  const router = useRouter();

  const protectedFetch = async (url, options = {}) => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      console.log('No access token found, redirecting to login');
      router.push('/login');
      return null;
    }

    try {
      const res = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          console.log('401 Unauthorized, redirecting to login');
          localStorage.removeItem('accessToken');
          router.push('/login');
          return null;
        }
        
        // For rate limiting (429), return the response so the caller can handle it
        if (res.status === 429) {
          return res;
        }
        
        throw new Error(`HTTP error! status: ${res.status}, statusText: ${res.statusText}`);
      }

      return res;
    } catch (err) {
      console.error('Protected fetch error:', err);
      
      // Only redirect to login on authentication errors, not network errors
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        localStorage.removeItem('accessToken');
        router.push('/login');
      }
      
      throw err;
    }
  };

  return protectedFetch;
};
