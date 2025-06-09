'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/auth/callback';
  const apiBaseUrl = 'http://localhost:8080';

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const loginWithFacebook = () => {
    const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${facebookAppId}&redirect_uri=${redirectUri}&scope=pages_show_list,pages_manage_posts,instagram_basic,instagram_content_publish&response_type=code&state=facebook`;
    window.location.href = url;
  };

  const loginWithGoogle = () => {
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20email%20profile&access_type=offline&state=google`;
    window.location.href = url;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password
        }),
        credentials: 'include', // Important for cookies
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Login failed');
      }
      
      if (data.access_token) {
        localStorage.setItem('accessToken', data.access_token);
      }
      console.log('JWT token:', data.token);

      if (data.refresh_token) {
        localStorage.setItem('refreshToken', data.refresh_token);
      }

      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      console.log('Access Token:', data.access_token);
      console.log('Refresh Token:', data.refresh_token);

      // Show success message
      console.log('Login successful:', data.message);

      // Redirect to dashboard
      window.location.href = '/dashboard';
      
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-6xl w-full flex flex-col md:flex-row items-center justify-between">
        {/* Left: Login Card */}
        <div className="w-full md:w-1/2 p-6">
          <div className="bg-white border border-gray-200 shadow-lg rounded-2xl p-8 w-full max-w-md mx-auto">
            <h2 className="text-3xl font-bold text-black mb-1 text-center">Welcome Back</h2>
            <p className="text-sm text-gray-600 text-center mb-6">Login to manage your social posts</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="you@example.com"
                  className="w-full border border-gray-300 rounded-md px-4 py-2 mt-1 text-black text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    placeholder="••••••••"
                    className="w-full border border-gray-300 rounded-md px-4 py-2 pr-10 mt-1 text-black text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-black"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-black hover:bg-gray-900 disabled:bg-gray-400 text-white py-2 rounded-md font-semibold text-sm transition duration-200"
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <p className="text-sm text-center text-gray-500 mt-4">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-black font-medium hover:underline">
                Sign up
              </Link>
            </p>

            <div className="flex items-center my-6">
              <hr className="flex-grow border-gray-300" />
              <span className="mx-2 text-sm text-gray-400">or</span>
              <hr className="flex-grow border-gray-300" />
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={loginWithFacebook}
                className="flex items-center justify-center gap-2 w-full bg-white border border-gray-300 hover:border-gray-500 text-black py-2 rounded-md font-medium text-sm transition duration-200"
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png"
                  alt="Facebook"
                  className="w-5 h-5"
                />
                Continue with Facebook
              </button>
              <button
                onClick={loginWithGoogle}
                className="flex items-center justify-center gap-2 w-full bg-white border border-gray-300 hover:border-gray-500 text-black py-2 rounded-md font-medium text-sm transition duration-200"
              >
                <img
                  src="https://www.svgrepo.com/show/475656/google-color.svg"
                  alt="Google"
                  className="w-5 h-5"
                />
                Continue with Google
              </button>
            </div>
          </div>
        </div>

        {/* Right: Branding */}
        <div className="hidden md:flex md:w-1/2 justify-center items-center flex-col px-10">
          <Image src="/logo-ss.png" alt="Logo" width={80} height={80} className="mb-4" />
          <h1 className="text-5xl font-extrabold text-black tracking-tight">SocialSync</h1>
          <p className="text-gray-600 mt-2 text-lg text-center max-w-sm">
            Sync your social content across platforms in one place.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;