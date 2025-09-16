// hooks/useLogin.js
import { useState } from 'react';

export const useLogin = () => {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || data.message || 'Login failed');

      if (data.access_token) localStorage.setItem('accessToken', data.access_token);
      if (data.refresh_token) localStorage.setItem('refreshToken', data.refresh_token);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));

      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  return { login, isLoading };
};
