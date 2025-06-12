'use client';
// import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

import { useToggle } from '@/app/hooks/ui/useToggle';
import { useOAuthLogin } from '@/app/hooks/auth/useOAuthLogin';
import { useFormInput } from '@/app/hooks/form/useFormInput';
import { useLogin } from '@/app/hooks/auth/useLogin';
const Login = () => {

  const { loginWithFacebook, loginWithGoogle } = useOAuthLogin();
 
  const [showPassword, togglePassword] = useToggle(false);
  const { formData, handleInputChange, error, setError } = useFormInput({ email: '', password: '' });
  const { login, isLoading } = useLogin();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(formData.email, formData.password);

    if (result.success) {
      window.location.href = '/dashboard';
    } else {
      setError(result.error);
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
                    onClick={togglePassword}
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
          <Image
            src="/undraw_sign-in_uva0.svg" // Path to your SVG in the public folder
            alt="Login Illustration"
            width={500} // Adjust width as needed for your design
            height={400} // Adjust height as needed
            className="w-full h-auto max-w-lg" // Tailwind classes for responsiveness
            priority // Load this image with high priority
          />
        </div>
      </div>
    </div>
  );
};

export default Login;