'use client';

import { useEffect, useState } from 'react';
import SocialAccountCard from '../../components/SocialAccountCard';
import DisconnectModal from '../../components/DisconnectModal'; // Updated import statement
import { SiMastodon } from 'react-icons/si';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://socialsync-j7ih.onrender.com';

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
  const [showInstagramPageModal, setShowInstagramPageModal] = useState(false);
  const [facebookPages, setFacebookPages] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState('');

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

      // Group accounts by provider
      const byProvider = accounts.reduce((acc, a) => {
        const key = (a.provider || a.platform || '').toLowerCase();
        if (!acc[key]) acc[key] = [];
        acc[key].push(a);
        return acc;
      }, {});

      // Create platform data with multi-account support
      const platformData = platformsList.map((backendKey) => {
        const displayName = backendToDisplayName[backendKey];
        const accs = byProvider[backendKey] || [];
        const defaultAcc = accs.find((a) => a.isDefault) || accs[0];
        return {
          name: displayName,
          icon: getIcon(displayName),
          connected: accs.length > 0,
          userProfilePic:
            defaultAcc?.avatar && defaultAcc.avatar !== 'null'
              ? defaultAcc.avatar
              : null,
          accountName: defaultAcc?.displayName || defaultAcc?.profileName || '',
          accounts: accs,
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

  const fetchFacebookPagesForInstagram = async () => {
    try {
      console.log('Fetching Facebook pages from:', `${API_BASE_URL}/api/facebook/pages-for-instagram`);
      const res = await axios.get(`${API_BASE_URL}/api/facebook/pages-for-instagram`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Facebook pages response:', res.data);
      
      // Get existing Instagram accounts to check which Facebook Pages already have Instagram connected
      const accountsRes = await axios.get(`${API_BASE_URL}/api/social-accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allAccounts = Array.isArray(accountsRes.data) ? accountsRes.data : [];
      const instagramAccounts = allAccounts.filter(account => account.platform === 'instagram');
      
      console.log('Instagram accounts found:', instagramAccounts);
      console.log('Facebook pages:', res.data.pages);
      
      // Add Instagram connection status to each Facebook Page
      const pagesWithStatus = (res.data.pages || []).map(page => {
        // Check if any Instagram account is connected to this Facebook Page
        const connectedInstagram = instagramAccounts.find(ig => {
          // Check both social_id and external_account_id fields
          return ig.social_id === page.id || ig.external_account_id === page.id;
        });
        
        return {
          ...page,
          hasInstagram: !!connectedInstagram,
          instagramAccount: connectedInstagram
        };
      });
      
      console.log('Pages with status:', pagesWithStatus);
      setFacebookPages(pagesWithStatus);
    } catch (err) {
      console.error('Error fetching Facebook pages:', err);
      console.error('Error details:', err.response?.data);
      setStatusMessage('Failed to fetch Facebook pages');
      setStatusType('error');
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
          try {
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
          } catch (instagramError) {
            if (instagramError.response?.status === 400 && 
                instagramError.response?.data?.includes('Facebook Page not connected')) {
              setStatusMessage('Please connect your Facebook account first. Instagram requires a connected Facebook Business Page.');
              setStatusType('error');
            } else {
              throw instagramError; // Re-throw to be caught by outer try-catch
            }
          }
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
      // Connected already → connect another account of this provider
      try {
        if (platformName === 'Facebook') {
          window.location.href = `${API_BASE_URL}/auth/facebook/login?token=${token}`;
        } else if (platformName === 'Instagram') {
          // Show Facebook Page selection modal for Instagram
          await fetchFacebookPagesForInstagram();
          setShowInstagramPageModal(true);
          return;
        } else if (platformName === 'YouTube') {
          window.location.href = `${API_BASE_URL}/auth/youtube/login?token=${token}`;
        } else if (platformName === 'Twitter (X)') {
          window.location.href = `${API_BASE_URL}/auth/twitter/login?token=${token}`;
        } else if (platformName === 'Mastodon') {
          const instance = 'mastodon.social';
          window.location.href = `${API_BASE_URL}/auth/mastodon/login?instance=${encodeURIComponent(instance)}&token=${token}`;
        } else if (platformName === 'Telegram') {
          setShowTelegramModal(true);
          return;
        }
      } catch (err) {
        const msg = err?.response?.data?.error || `Failed to start connect flow for ${platformName}.`;
        setStatusMessage(msg);
        setStatusType('error');
      }
    }
  };

  // Remove a specific connected account by id
  const handleRemoveAccount = async (accountId) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/social-accounts/${accountId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchAccounts();
      setStatusMessage('Account disconnected successfully.');
      setStatusType('success');
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to disconnect account.';
      setStatusMessage(msg);
      setStatusType('error');
    }
  };

  // Set default account for a provider
  const handleMakeDefault = async (accountId) => {
    try {
      await axios.put(`${API_BASE_URL}/api/social-accounts/${accountId}/default`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchAccounts();
      setStatusMessage('Default account updated.');
      setStatusType('success');
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to set default account.';
      setStatusMessage(msg);
      setStatusType('error');
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

  const handleInstagramConnect = async () => {
    if (!selectedPageId) {
      setStatusMessage('Please select a Facebook Page.');
      setStatusType('error');
      return;
    }

    try {
      await axios.post(
        `${API_BASE_URL}/connect/instagram?pageId=${selectedPageId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatusMessage('Instagram account connected successfully!');
      setStatusType('success');
      setShowInstagramPageModal(false);
      setSelectedPageId('');
      fetchAccounts();
    } catch (err) {
      setStatusMessage(
        err?.response?.data?.error || 'Failed to connect Instagram account.'
      );
      setStatusType('error');
    }
  };

  return (
    <div className="p-5 md:p-6 max-w-7xl mx-auto">
      {/* Header with stronger visual hierarchy */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Manage Accounts</h1>
        <p className="text-base md:text-lg text-gray-600">Manage connected accounts for posting & analytics.</p>
      </div>

      {/* Status message with better styling */}
      {statusMessage && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm font-medium ${
            statusType === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
          role="alert"
          aria-live="polite"
        >
          {statusMessage}
        </div>
      )}

      {/* Loading state with skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-80 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaTimesCircle className="text-red-500 text-2xl" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load accounts</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchAccounts}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-8">
          {platforms.map((platform) => (
            <SocialAccountCard
              key={platform.name}
              platform={platform.name}
              IconComponent={platform.icon}
              connected={platform.connected}
              userProfilePic={platform.userProfilePic}
              accountName={platform.accountName}
              accounts={platform.accounts}
              onConnect={() => handleConnect(platform.name, platform.connected)}
              onRemoveAccount={handleRemoveAccount}
              onMakeDefault={handleMakeDefault}
            />
          ))}
        </div>
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

      {/* Instagram Facebook Page Selection Modal */}
      {showInstagramPageModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
                Select Facebook Page for Instagram
              </h3>
              <p className="text-sm md:text-base text-gray-600 mb-4">
                Choose which Facebook Page to connect with Instagram. Each Facebook Page can have one Instagram Business account.
              </p>
              
              {facebookPages.every(page => page.hasInstagram) && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    All your Facebook Pages already have Instagram accounts connected. 
                    To connect additional Instagram accounts, you'll need to connect more Facebook Pages first.
                  </p>
                </div>
              )}
              
              {facebookPages.length === 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    No Facebook Pages found. Please connect a Facebook account first before connecting Instagram.
                  </p>
                </div>
              )}
              
              <div className="space-y-3 mb-4">
                {facebookPages.map((page) => (
                  <div key={page.id} className={`p-3 border rounded-lg ${page.hasInstagram ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}>
                    <label className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="facebookPage"
                        value={page.id}
                        checked={selectedPageId === page.id}
                        onChange={(e) => setSelectedPageId(e.target.value)}
                        disabled={page.hasInstagram}
                        className="text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-3">
                          {page.avatar && (
                            <img
                              src={page.avatar}
                              alt={page.name}
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                          <div>
                            <span className="text-sm md:text-base font-medium text-gray-900">
                              {page.name}
                            </span>
                            {page.hasInstagram && (
                              <div className="text-xs text-green-600 font-medium">
                                ✓ Connected to @{page.instagramAccount?.profile_name || 'Instagram'}
                              </div>
                            )}
                          </div>
                        </div>
                        {page.hasInstagram && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Already Connected
                          </span>
                        )}
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                <button
                  type="button"
                  className="bg-gray-300 text-gray-700 px-4 py-2 md:py-3 rounded hover:bg-gray-400 transition-colors text-sm md:text-base min-h-[44px]"
                  onClick={() => {
                    setShowInstagramPageModal(false);
                    setSelectedPageId('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="bg-blue-600 text-white px-4 py-2 md:py-3 rounded hover:bg-blue-700 transition-colors text-sm md:text-base min-h-[44px] disabled:opacity-50"
                  onClick={handleInstagramConnect}
                  disabled={!selectedPageId || facebookPages.find(p => p.id === selectedPageId)?.hasInstagram}
                >
                  Connect Instagram
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

 
    </div>
  );
}