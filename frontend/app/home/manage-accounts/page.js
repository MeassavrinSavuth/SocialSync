'use client';

import { useEffect, useState } from 'react';
import SocialAccountCard from '../../components/SocialAccountCard';
import { FaFacebook, FaInstagram, FaYoutube, FaTiktok, FaTwitter } from 'react-icons/fa';
import axios from 'axios';

export default function ManageAccountPage() {
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Access token not found.');
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get('http://localhost:8080/api/social-accounts', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const accounts = Array.isArray(res.data) ? res.data : [];

        const allPlatforms = ['Facebook', 'Instagram', 'YouTube', 'TikTok', 'Twitter (X)'];
        const platformData = allPlatforms.map((name) => {
          const account = accounts.find(
            (acc) => acc?.platform?.toLowerCase() === name.toLowerCase()
          );
          return {
            name,
            icon: getIcon(name),
            connected: !!account,
            userProfilePic: account?.profilePictureUrl || null,
          };
        });

        setPlatforms(platformData);
      } catch (err) {
        setError('Failed to fetch social accounts.');
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  const getIcon = (platform) => {
    switch (platform) {
      case 'Facebook':
        return FaFacebook;
      case 'Instagram':
        return FaInstagram;
      case 'YouTube':
        return FaYoutube;
      case 'TikTok':
        return FaTiktok;
      case 'Twitter (X)':
        return FaTwitter;
      default:
        return null;
    }
  };

  const handleConnect = async (platformName) => {
  if (platformName === 'Facebook') {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('You must be logged in to connect Facebook.');
      return;
    }

    // Instead of fetch, build URL with token query param or header-less and redirect browser directly
    const url = `http://localhost:8080/auth/facebook/login?token=${token}`;
    // Redirect browser (not AJAX fetch)
    window.location.href = url;

  } else {
    alert(`Connect to ${platformName} is not yet implemented.`);
  }
};


  return (
    <div className="p-6">
      <div className="flex items-center mb-6 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Hello!</h1>
          <p className="text-gray-600">Manage Your Social Media Accounts</p>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          <p className="mb-6 text-gray-600">
            Connect or disconnect your accounts to start managing content across platforms.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {platforms.map((platform) => (
              <SocialAccountCard
                key={platform.name}
                platform={platform.name}
                IconComponent={platform.icon}
                connected={platform.connected}
                userProfilePic={platform.userProfilePic}
                onConnect={() => handleConnect(platform.name)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
