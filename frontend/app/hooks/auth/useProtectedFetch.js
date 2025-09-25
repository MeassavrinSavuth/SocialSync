import { useRouter } from 'next/navigation';

// Client-side protected fetch helper
export const useProtectedFetch = () => {
  const router = useRouter();
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

  const protectedFetch = async (url, options = {}) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    if (!token) {
      console.log('No access token found, redirecting to login');
      router.push('/login');
      return null;
    }

    // If caller passed a relative path (starts with '/'), route it to the API server
    let fetchUrl = url;
    if (typeof url === 'string' && url.startsWith('/')) {
      // Prepend `/api` because backend routes are mounted under /api
      fetchUrl = `${API_BASE_URL}/api${url}`;
    }

    try {
      const res = await fetch(fetchUrl, {
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

        // For rate limiting (429), return the raw response so the caller can handle headers/status
        if (res.status === 429) {
          return res;
        }

        // Try to extract an error message from the response body if available
        try {
          const errBody = await res.text();
          throw new Error(`HTTP error ${res.status}: ${errBody || res.statusText}`);
        } catch (e) {
          throw new Error(`HTTP error! status: ${res.status}, statusText: ${res.statusText}`);
        }
      }

      // Parse JSON body when possible and return it so callers can use `res.data` like they expect
      try {
        const json = await res.json();
        return json;
      } catch (e) {
        // No JSON body (e.g., 204 No Content) — return the raw response
        return res;
      }
    } catch (err) {
      console.error('Protected fetch error:', err);

      // Only redirect to login on authentication errors, not network errors
      if (err.message && (err.message.includes('401') || err.message.includes('Unauthorized'))) {
        localStorage.removeItem('accessToken');
        router.push('/login');
        return null;
      }

      // Re-throw for callers to handle
      throw err;
    }
  };

  return protectedFetch;
};
