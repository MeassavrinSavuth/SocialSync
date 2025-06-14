// pages/manage-accounts/page.js
'use client';

import SocialAccountCard from '../../components/SocialAccountCard';
// No direct Image import needed here for the main page, it's used in SocialAccountCard
// import Image from 'next/image';

// Import specific icons from react-icons/fa
import { FaFacebook, FaInstagram, FaYoutube, FaTiktok, FaXTwitter } from 'react-icons/fa';

const platforms = [
  {
    name: 'Facebook',
    icon: FaFacebook,
    connected: false,
    userProfilePic: null, // No profile pic if not connected
  },
  {
    name: 'Instagram',
    icon: FaInstagram,
    connected: true,
    // Placeholder: In a real app, this would be a dynamic URL from your backend
    userProfilePic: '/images/instagram-user-profile-placeholder.png', // Create this file in public/images
  },
  {
    name: 'YouTube',
    icon: FaYoutube,
    connected: false,
    userProfilePic: null,
  },
  {
    name: 'TikTok',
    icon: FaTiktok,
    connected: false,
    userProfilePic: null,
  },
  {
    name: 'Twitter (X)',
    icon: FaXTwitter,
    connected: true,
    // Placeholder: In a real app, this would be a dynamic URL from your backend
    userProfilePic: '/images/x-user-profile-placeholder.png', // Create this file in public/images
  }
];

export default function ManageAccountPage() {
  return (
    <div className="p-6">
      <div className="flex items-center mb-6 border-b pb-4">
        {/* Removed the main user profile picture section from here */}
        {/* as the request was for individual cards */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Hello!</h1>
          <p className="text-gray-600">Manage Your Social Media Accounts</p>
        </div>
      </div>
      
      <p className="mb-6 text-gray-600">Connect or disconnect your accounts to start managing content across platforms.</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {platforms.map((platform) => (
          <SocialAccountCard
            key={platform.name}
            platform={platform.name}
            IconComponent={platform.icon} // Platform's official icon (e.g., Facebook logo)
            connected={platform.connected}
            userProfilePic={platform.userProfilePic} // User's profile picture for that platform
            onConnect={() => alert(`Connect to ${platform.name}`)}
          />
        ))}
      </div>
    </div>
  );
}