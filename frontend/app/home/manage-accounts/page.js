'use client';

import { useEffect, useState } from 'react';
import SocialAccountCard from '../../components/SocialAccountCard';
import ConfirmModal from '../../components/ConfirmModal';
import { FaFacebook, FaInstagram, FaYoutube, FaTiktok, FaTwitter } from 'react-icons/fa';
import axios from 'axios';

export default function ManageAccountPage() {
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('success');

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

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

  const fetchAccounts = async () => {
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
      console.error(err);
      setError('Failed to fetch social accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Clear status message after 5 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const handleConnect = async (platformName, isConnected) => {
    if (!token) {
      setStatusMessage('You must be logged in.');
      setStatusType('error');
      return;
    }

    // Check if Facebook is connected (needed for Instagram)
    const isFacebookConnected = platforms.find(p => p.name === 'Facebook')?.connected;

    if (!isConnected) {
      if (platformName === 'Instagram' && !isFacebookConnected) {
        setStatusMessage('Please connect your Facebook Page first before connecting Instagram.');
        setStatusType('error');
        return;
      }

      // Connect logic
      if (platformName === 'Facebook') {
        const url = `http://localhost:8080/auth/facebook/login?token=${token}`;
        window.location.href = url;
      } else if (platformName === 'Instagram') {
        try {
          await axios.post(
            'http://localhost:8080/connect/instagram',
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          setStatusMessage('Instagram account connected successfully!');
          setStatusType('success');
          fetchAccounts();
        } catch (err) {
          const msg = err?.response?.data?.error || 'Failed to connect Instagram.';
          setStatusMessage(msg);
          setStatusType('error');
        }
      } else {
        setStatusMessage(`Connect to ${platformName} is not yet implemented.`);
        setStatusType('error');
      }
    } else {
      // Disconnect logic
      try {
        await axios.delete(`http://localhost:8080/api/social-accounts/${platformName.toLowerCase()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setPlatforms((prev) =>
          prev.map((p) =>
            p.name === platformName
              ? { ...p, connected: false, userProfilePic: null }
              : p
          )
        );

        setStatusMessage(`${platformName} disconnected successfully.`);
        setStatusType('success');
      } catch (err) {
        setStatusMessage(`Failed to disconnect ${platformName}.`);
        setStatusType('error');
      }
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

      {statusMessage && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            statusType === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
          role="alert"
          aria-live="polite"
        >
          {statusMessage}
        </div>
      )}

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
                onConnect={() => handleConnect(platform.name, platform.connected)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
