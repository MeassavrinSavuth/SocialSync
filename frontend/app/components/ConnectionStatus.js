'use client';

import React from 'react';
import { FaExclamationTriangle, FaPlug, FaCheckCircle, FaTwitter, FaFacebook, FaInstagram, FaYoutube } from 'react-icons/fa';
import { SiMastodon } from 'react-icons/si';

const getPlatformIcon = (platform) => {
  switch (platform.toLowerCase()) {
    case 'twitter': return FaTwitter;
    case 'facebook': return FaFacebook;
    case 'instagram': return FaInstagram;
    case 'youtube': return FaYoutube;
    case 'mastodon': return SiMastodon;
    default: return FaPlug;
  }
};

const getPlatformColor = (platform) => {
  switch (platform.toLowerCase()) {
    case 'twitter': return 'text-blue-500';
    case 'facebook': return 'text-blue-600';
    case 'instagram': return 'text-pink-500';
    case 'youtube': return 'text-red-600';
    case 'mastodon': return 'text-purple-600';
    default: return 'text-gray-500';
  }
};

export default function ConnectionStatus({ 
  platform, 
  isConnected, 
  error, 
  onReconnect,
  lastConnected 
}) {
  const PlatformIcon = getPlatformIcon(platform);
  const platformColor = getPlatformColor(platform);
  const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);

  if (isConnected && !error) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
            <FaCheckCircle className="text-green-500 text-xl" />
          </div>
          <div>
            <h3 className="text-green-800 font-semibold text-lg">Connected to {platformName}</h3>
            <p className="text-green-600 text-sm">
              {lastConnected && `Last connected: ${new Date(lastConnected).toLocaleDateString()}`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check if it's a rate limit error
  if (error?.isRateLimit) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
            <FaExclamationTriangle className="text-orange-500 text-xl" />
          </div>
          <div className="flex-1">
            <h3 className="text-orange-800 font-semibold text-lg mb-2">
              Rate Limit Reached
            </h3>
            <p className="text-orange-700 mb-4">
              {error.message || `${platformName} API rate limit has been reached.`}
            </p>
            <div className="bg-orange-100 rounded-lg p-4">
              <p className="text-orange-800 font-medium text-sm mb-2">What you can do:</p>
              <ul className="text-orange-700 text-sm space-y-1">
                <li>• Wait 15-30 minutes before trying again</li>
                <li>• Twitter's free API allows 50 requests per 24 hours</li>
                <li>• Consider upgrading to Twitter API Pro for higher limits</li>
                <li>• Your account is still connected - just temporarily rate limited</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error?.needsReconnect) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start">
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
            <FaExclamationTriangle className="text-yellow-500 text-xl" />
          </div>
          <div className="flex-1">
            <h3 className="text-yellow-800 font-semibold text-lg mb-2">
              Reconnection Required
            </h3>
            <p className="text-yellow-700 mb-4">
              {error.message || `Your ${platformName} connection needs to be refreshed.`}
            </p>
            <div className="bg-yellow-100 rounded-lg p-4 mb-4">
              <p className="text-yellow-800 font-medium text-sm mb-2">This can happen when:</p>
              <ul className="text-yellow-700 text-sm space-y-1">
                <li>• Your access token has expired</li>
                <li>• You changed your password on {platformName}</li>
                <li>• You revoked app permissions</li>
                <li>• The platform updated their security requirements</li>
              </ul>
            </div>
            <button
              onClick={onReconnect}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center font-medium"
            >
              <PlatformIcon className={`mr-2 ${platformColor.replace('text-', 'text-white')}`} />
              Reconnect {platformName}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-6">
      <div className="flex items-center">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mr-4">
          <PlatformIcon className={`text-gray-400 text-xl`} />
        </div>
        <div>
          <h3 className="text-gray-800 font-semibold text-lg">Connect to {platformName}</h3>
          <p className="text-gray-600 text-sm">
            Connect your {platformName} account to view your posts.
          </p>
        </div>
      </div>
    </div>
  );
}
