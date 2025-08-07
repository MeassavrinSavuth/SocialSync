import { useRouter } from 'next/navigation';

export const useProtectedFetch = () => {
  const router = useRouter();

  const protectedFetch = async (url, options = {}) => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      router.push('/login');
      return null;
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return null;
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      return res;
    } catch (err) {
      console.error('Protected fetch error:', err);
      // Only redirect to login for authentication errors, not all errors
      if (err.message && err.message.includes('401')) {
        router.push('/login');
      }
      throw err; // Re-throw the error so the calling code can handle it
    }
  };

  return protectedFetch;
};
