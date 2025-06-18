'use client';

import { useUser } from '../../hooks/auth/useUser';
import { useState } from 'react';
import ProfilePhotoSection from '../../components/ProfilePhotoSection';
import NameSection from '../../components/NameSection';
import EmailSection from '../../components/EmailSection';
import PasswordSection from '../../components/PasswordSection';
import LogoutSection from '../../components/LogoutSection';

export default function ProfileSettings() {
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const user = useUser();

  if (!user || user.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-base text-gray-600 animate-pulse">Loading user data...</div>
      </div>
    );
  }

  const { profileData, setProfileData } = user;

  if (!profileData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-base text-gray-600 animate-pulse">Fetching profile details...</div>
      </div>
    );
  }

const handleImageChange = async (e) => {
  const file = e.target.files[0];
  if (file) {
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append('profileImage', file);
      const accessToken = localStorage.getItem('accessToken');

      const response = await fetch('http://localhost:8080/api/profile/image', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload image');
      }
      const data = await response.json();

      const baseUrl = 'http://localhost:8080';
      const fullImageUrl = data.imageUrl.startsWith('http')
        ? data.imageUrl
        : baseUrl + data.imageUrl;

      setImagePreview(fullImageUrl);
      setProfileData(prev => ({ ...prev, profileImage: fullImageUrl }));
    } catch (err) {
      setError(err.message || 'Failed to upload image');
      console.error('Image upload error:', err);
      setImagePreview(profileData.profileImage || '/default-avatar.png');
    }
  }
};
 

  const handleSaveChanges = async (field) => {
    setError(null);
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update ${field}`);
      }
    } catch (err) {
      setError(err.message || `Failed to update ${field}`);
      console.error(`Update error (${field}):`, err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6 md:p-8 space-y-6 border border-gray-200">
        <h1 className="text-3xl font-bold text-center text-indigo-700 mb-6">Profile Settings</h1>

        {error && (
          <div className="p-3 bg-red-50 border border-red-300 rounded-md text-red-700 flex items-center space-x-2 text-sm">
            <p className="font-medium">{error}</p>
          </div>
        )}

        <ProfilePhotoSection
          profileImage={profileData.profileImage}
          imagePreview={imagePreview}
          onImageChange={handleImageChange}
          error={error}
        />

        <NameSection
          name={profileData.name}
          onNameChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
          onSave={() => handleSaveChanges('name')}
        />

        <EmailSection email={profileData.email} />

        <PasswordSection provider={profileData.provider} />

        <LogoutSection
          showLogoutConfirm={showLogoutConfirm}
          setShowLogoutConfirm={setShowLogoutConfirm}
        />
      </div>
    </div>
  );
}
