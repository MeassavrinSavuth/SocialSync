'use client';

import { useEffect, useState } from 'react';
import SocialAccountCard from '../../components/SocialAccountCard';
import DisconnectModal from '../../components/DisconnectModal'; // Updated import statement
import { SiMastodon } from 'react-icons/si';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

import { FaFacebook, FaInstagram, FaYoutube, FaTwitter, FaTelegram } from 'react-icons/fa';
import axios from 'axios';

export default function ManageAccountPage() {
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('success');

  // Modal specific state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [platformToDisconnect, setPlatformToDisconnect] = useState(null);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramLoading, setTelegramLoading] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  // Map backend platform keys to frontend display names
  // Reordered to move TikTok to the end
  const backendToDisplayName = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    youtube: 'YouTube',
    twitter: 'Twitter (X)',
    mastodon: 'Mastodon',
    telegram: 'Telegram',
  // threads and tiktok removed
  };

  // List of platforms to display, reordered for TikTok
  const platformsList = [
    'facebook',
    'instagram',
    'youtube',
    'twitter',
  'mastodon',
  'telegram',
  ];


  // Return the appropriate icon component based on display name
  const getIcon = (platform) => {
    switch (platform) {
      case 'Facebook':
        return FaFacebook;
      case 'Instagram':
        return FaInstagram;
      case 'YouTube':
        return FaYoutube;
  // TikTok removed
      case 'Twitter (X)':
        return FaTwitter;
      case 'Mastodon':
        return SiMastodon;
  // Threads removed
      case 'Telegram': // Added Telegram
        return FaTelegram;
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
      const res = await axios.get(`${API_BASE_URL}/api/social-accounts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const accounts = Array.isArray(res.data) ? res.data : [];

      // Create platform data by mapping backend keys to frontend display names
      const platformData = platformsList.map((backendKey) => { // Iterate over platformsList to maintain order
        const displayName = backendToDisplayName[backendKey];
        const account = accounts.find(
          (acc) => acc?.platform?.toLowerCase() === backendKey
        );

        return {
          name: displayName,
          icon: getIcon(displayName),
          connected: !!account,
          // Defensive check on profilePictureUrl
          userProfilePic:
            account?.profilePictureUrl && account.profilePictureUrl !== 'null'
              ? account.profilePictureUrl
              : null,
          accountName: account?.profileName || '',
        };
      });

      setPlatforms(platformData);
      setError(null);
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

  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const handleConnect = async (platformName, isConnected) => {
    if (!token) {
      setStatusMessage('You must be logged in.');
      setStatusType('error');
      return;
    }

    const isFacebookConnected = platforms.find((p) => p.name === 'Facebook')?.connected;

    if (!isConnected) {
      // Logic for connecting (no change here)
      if (platformName === 'Instagram' && !isFacebookConnected) {
        setStatusMessage('Please connect your Facebook Page first before connecting Instagram.');
        setStatusType('error');
        return;
      }

      try {
        if (platformName === 'Facebook') {
          window.location.href = `${API_BASE_URL}/auth/facebook/login?token=${token}`;
        } else if (platformName === 'Instagram') {
          await axios.post(
            `${API_BASE_URL}/connect/instagram`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          setStatusMessage('Instagram account connected successfully!');
          setStatusType('success');
          fetchAccounts();
        } else if (platformName === 'YouTube') {
          window.location.href = `${API_BASE_URL}/auth/youtube/login?token=${token}`;
  // TikTok handler removed
        } else if (platformName === 'Twitter (X)') {
          window.location.href = `${API_BASE_URL}/auth/twitter/login?token=${token}`;
        } else if (platformName === 'Mastodon') {
          const instance = 'mastodon.social';
          window.location.href = `${API_BASE_URL}/auth/mastodon/login?instance=${encodeURIComponent(
            instance
          )}&token=${token}`;
  // Threads handler removed
        } else if (platformName === 'Telegram') {
          setShowTelegramModal(true);
          return;
        } else {
          setStatusMessage(`Connect to ${platformName} is not yet implemented.`);
          setStatusType('error');
        }
      } catch (err) {
        const msg = err?.response?.data?.error || `Failed to connect ${platformName}.`;
        setStatusMessage(msg);
        setStatusType('error');
      }
    } else {
      // Logic for showing confirmation modal before disconnecting
      setPlatformToDisconnect(platformName);
      setShowConfirmModal(true);
    }
  };

  const handleConfirmDisconnect = async () => {
    setShowConfirmModal(false); // Close the modal immediately
    if (!platformToDisconnect) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/social-accounts/${platformToDisconnect.toLowerCase()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPlatforms((prev) =>
        prev.map((p) =>
          p.name === platformToDisconnect ? { ...p, connected: false, userProfilePic: null, accountName: '' } : p
        )
      );

      setStatusMessage(`${platformToDisconnect} disconnected successfully.`);
      setStatusType('success');
    } catch (err) {
      const msg = err?.response?.data?.error || `Failed to disconnect ${platformToDisconnect}.`;
      setStatusMessage(msg);
      setStatusType('error');
    } finally {
      setPlatformToDisconnect(null); // Clear the platform being disconnected
    }
  };

  const handleCloseConfirmModal = () => {
    setShowConfirmModal(false);
    setPlatformToDisconnect(null); // Clear the platform being disconnected
  };

  // Telegram connect handler
  const handleTelegramConnect = async (e) => {
    e.preventDefault();
    if (!telegramChatId) {
      setStatusMessage('Please enter your Telegram channel username.');
      setStatusType('error');
      return;
    }
    setTelegramLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/connect/telegram`,
        { chat_id: telegramChatId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatusMessage('Telegram channel connected successfully!');
      setStatusType('success');
      setShowTelegramModal(false);
      setTelegramChatId('');
      fetchAccounts();
    } catch (err) {
      setStatusMessage(
        err?.response?.data?.error || 'Failed to connect Telegram channel.'
      );
      setStatusType('error');
    } finally {
      setTelegramLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center mb-4 md:mb-6 border-b pb-3 md:pb-4">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800">Hello!</h1>
          <p className="text-sm md:text-base text-gray-600">Manage Your Social Media Accounts</p>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`mb-3 md:mb-4 p-3 md:p-4 rounded-lg text-xs md:text-sm ${
            statusType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
          role="alert"
          aria-live="polite"
        >
          {statusMessage}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm md:text-base">Loading accounts...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-500 text-sm md:text-base">{error}</p>
        </div>
      ) : (
        <>
          <p className="mb-4 md:mb-6 text-sm md:text-base text-gray-600">
            Connect or disconnect your accounts to start managing content across platforms.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {platforms.map((platform) => (
              <SocialAccountCard
                key={platform.name}
                platform={platform.name}
                IconComponent={platform.icon}
                connected={platform.connected}
                userProfilePic={platform.userProfilePic}
                accountName={platform.accountName}
                onConnect={() => handleConnect(platform.name, platform.connected)}
              />
            ))}
          </div>
        </>
      )}

      {/* Disconnect Modal */}
      <DisconnectModal
        show={showConfirmModal}
        onClose={handleCloseConfirmModal}
        onConfirm={handleConfirmDisconnect}
        platformName={platformToDisconnect}
      />

      {showTelegramModal && (
  <div
    className="fixed inset-0 flex items-center justify-center z-50 p-4"
    style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }} // dimmed overlay
  >
    <div className="bg-white rounded-2xl p-4 md:p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
      <h2 className="text-base md:text-lg font-bold mb-3 md:mb-4 text-gray-800">
        Connect Telegram Channel
      </h2>

      <div className="space-y-2 md:space-y-3 text-xs md:text-sm text-gray-700 mb-3 md:mb-4">
        <p className="font-medium">Follow these steps to connect:</p>
        <ol className="list-decimal list-inside space-y-1 text-xs md:text-sm">
          <li>Open your Telegram channel settings.</li>
          <li>
            Add our bot{" "}
            <a
              href="https://t.me/socialsync_telebot"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gray-900 hover:underline break-all"
            >
              @socialsync_telebot
            </a>{" "}
            as an <span className="font-semibold">Admin</span> of your channel.
          </li>
          <li>
            Enter your <span className="font-semibold">channel username</span>{" "}
            below (e.g.,{" "}
            <span className="text-gray-900">@socialsyncchannel</span>).
          </li>
        </ol>
      </div>

      <form onSubmit={handleTelegramConnect} className="space-y-3 md:space-y-4">
        <input
          type="text"
          value={telegramChatId}
          onChange={(e) => setTelegramChatId(e.target.value)}
          placeholder="@yourchannelname"
          className="mt-1 block w-full border text-gray-700 border-gray-300 rounded-md p-2 md:p-3 text-sm md:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          required
        />

        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
          <button
            type="button"
            className="bg-gray-300 text-gray-700 px-4 py-2 md:py-3 rounded hover:bg-gray-400 transition-colors text-sm md:text-base min-h-[44px]"
            onClick={() => setShowTelegramModal(false)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 md:py-3 rounded hover:bg-blue-700 transition-colors text-sm md:text-base min-h-[44px] disabled:opacity-50"
            disabled={telegramLoading}
          >
            {telegramLoading ? "Connecting..." : "Connect"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

 
    </div>
  );
}