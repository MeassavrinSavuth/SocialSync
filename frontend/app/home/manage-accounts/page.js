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
      console.log('accessToken:', token);

      if (!token) {
        console.error('No access token found in localStorage');
        setError('Access token not found.');
        setLoading(false);
        return;
      }

      try {
        console.log("Token being sent:", token);

        const res = await axios.get('http://localhost:8080/api/social-accounts', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const accounts = Array.isArray(res.data) ? res.data : [];
        console.log("Fetched accounts:", accounts);

        const allPlatforms = ['Facebook', 'Instagram', 'YouTube', 'TikTok', 'Twitter (X)'];
        const platformData = allPlatforms.map(name => {
          const account = accounts.find(
            acc => acc?.platform?.toLowerCase() === name.toLowerCase()
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
        console.error('Failed to fetch social accounts:', err);
        setError('Failed to fetch social accounts.');
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  const getIcon = (platform) => {
    switch (platform) {
      case 'Facebook': return FaFacebook;
      case 'Instagram': return FaInstagram;
      case 'YouTube': return FaYoutube;
      case 'TikTok': return FaTiktok;
      case 'Twitter (X)': return FaTwitter;
      default: return null;
    }
  };

  const handleConnect = (platformName) => {
    switch (platformName) {
      case 'Facebook':
        window.location.href = 'http://localhost:8080/auth/facebook/login';
        break;
      case 'Instagram':
      case 'YouTube':
      case 'TikTok':
      case 'Twitter (X)':
      default:
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
