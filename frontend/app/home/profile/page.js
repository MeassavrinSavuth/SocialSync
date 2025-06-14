// app/(dashboard)/profile/page.js
'use client';

import { useUser } from '../../hooks/auth/useUser';
import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FaCamera, FaSave, FaExclamationTriangle } from 'react-icons/fa';

export default function ProfileSettings() {
  const router = useRouter();
  const [imagePreview, setImagePreview] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState(null);


  const user = useUser();

if (!user) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg text-gray-600">Loading user...</div>
    </div>
  );
}

const { profileData, setProfileData, isLoading } = user;


  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);

      try {
        const formData = new FormData();
        formData.append('profileImage', file);
        const accessToken = localStorage.getItem('accessToken');

        const response = await fetch('http://localhost:8080/api/profile/image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: formData,
        });

        if (!response.ok) throw new Error('Failed to upload image');

        const data = await response.json();
        setProfileData(prev => ({ ...prev, profileImage: data.imageUrl }));
      } catch (err) {
        setError('Failed to upload image');
        console.error('Image upload error:', err);
      }
    }
  };

  const handleSaveChanges = async (field) => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:8080/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ [field]: profileData[field] }),
      });

      if (!response.ok) throw new Error(`Failed to update ${field}`);
    } catch (err) {
      setError(`Failed to update ${field}`);
      console.error(`Update error (${field}):`, err);
    }
  };

  const handlePasswordChange = () => router.push('/profile/change-password');

  const handleDeleteAccount = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:8080/api/profile', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete account');

      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
    } catch (err) {
      setError('Failed to delete account');
      console.error('Delete error:', err);
    }
  };

  if (isLoading || !profileData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile Settings</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-600">
            {error}
          </div>
        )}

        {/* Profile Photo */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Profile Photo</h2>
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200">
                <Image
                  src={imagePreview || profileData.profileImage || '/default-avatar.png'}
                  alt="Profile"
                  width={128}
                  height={128}
                  className="object-cover w-full h-full"
                />
              </div>
              <label className="absolute bottom-0 right-0 bg-indigo-600 p-2 rounded-full cursor-pointer hover:bg-indigo-700 transition-colors">
                <FaCamera className="text-white" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Name */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2 text-gray-900">Name</h2>
          <div className="flex space-x-4">
            <input
              type="text"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              className="flex-1 p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
              placeholder="Your name"
            />
            <button
              onClick={() => handleSaveChanges('name')}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors flex items-center"
            >
              <FaSave className="mr-2" /> Save Changes
            </button>
          </div>
        </div>

        {/* Email */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2 text-gray-900">Email</h2>
          <div className="flex space-x-4">
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              className="flex-1 p-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
              placeholder="your.email@example.com"
            />
            <button
              onClick={() => handleSaveChanges('email')}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors flex items-center"
            >
              <FaSave className="mr-2" /> Save Changes
            </button>
          </div>
        </div>

        {/* Password */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-gray-900">Password</h2>
          <button
            onClick={handlePasswordChange}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
          >
            Change Password
          </button>
        </div>

        {/* Logout */}
        <div className="border-t pt-8">
          <button
          onClick={() => {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            router.push('/login');
          }}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>

      </div>
    </div>
  );
}
