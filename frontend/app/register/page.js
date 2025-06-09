'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

const Register = () => {
  const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const redirectUri = 'http://localhost:3000/auth/callback';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (formData.password !== formData.confirmPassword) {
    setError('Passwords do not match');
    return;
  }

  try {
    const res = await fetch('http://localhost:8080/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Something went wrong');
    }

    // Optional: redirect user to login or dashboard
    console.log('Registered successfully:', data);
    // window.location.href = '/verify';
    window.location.href = `/verify?email=${encodeURIComponent(formData.email)}`;
  } catch (err) {
    setError(err.message);
  }
};

  const loginWithFacebook = () => {
    const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${facebookAppId}&redirect_uri=${redirectUri}&scope=email,public_profile&response_type=code`;
    window.location.href = url;
  };

  const loginWithGoogle = () => {
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20email%20profile&access_type=offline`;
    window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-6xl w-full flex flex-col md:flex-row items-center justify-between">
        {/* Left: Register Form */}
        <div className="w-full md:w-1/2 p-6">
          <div className="bg-white border border-gray-200 shadow-lg rounded-2xl p-8 w-full max-w-md mx-auto">
            <h2 className="text-3xl font-bold text-black mb-1 text-center">Create an Account</h2>
            <p className="text-sm text-gray-600 text-center mb-6">Join SocialSync to manage your posts</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  className="w-full border border-gray-300 rounded-md px-4 py-2 mt-1 text-black text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full border border-gray-300 rounded-md px-4 py-2 mt-1 text-black text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full border border-gray-300 rounded-md px-4 py-2 mt-1 text-black text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-9 right-3 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full border border-gray-300 rounded-md px-4 py-2 mt-1 text-black text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute top-9 right-3 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                className="w-full bg-black hover:bg-gray-900 text-white py-2 rounded-md font-semibold text-sm transition duration-200"
              >
                Sign Up
              </button>
            </form>

            <p className="text-sm text-center text-gray-500 mt-4">
              Already have an account?{' '}
              <Link href="/login" className="text-black font-medium hover:underline">
                Sign in
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
            One dashboard to control all your social content.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
