'use client';

import React from 'react';
import { FaExclamationTriangle, FaPlug, FaYoutube, FaFacebook, FaInstagram, FaTwitter } from 'react-icons/fa';
import { SiMastodon, SiTelegram } from 'react-icons/si';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://socialsync-j7ih.onrender.com';

const platformIcons = {
  youtube: FaYoutube,
  facebook: FaFacebook,
  instagram: FaInstagram,  
  twitter: FaTwitter,
  mastodon: SiMastodon,
  telegram: SiTelegram,
};

const platformColors = {
  youtube: 'text-red-600',
  facebook: 'text-blue-600',
  instagram: 'text-pink-600',
  twitter: 'text-blue-400',
  mastodon: 'text-purple-600',
  telegram: 'text-blue-500',
};

const AuthErrorModal = ({ isOpen, onClose, errors, onReconnect }) => {
  if (!isOpen || !errors || errors.length === 0) return null;

  // Filter errors that require reconnection
  const authErrors = errors.filter(error => 
    error.errorType === 'AUTH_EXPIRED' && error.errorAction === 'RECONNECT_REQUIRED'
  );

  // Other errors that don't require reconnection
  const otherErrors = errors.filter(error => 
    !(error.errorType === 'AUTH_EXPIRED' && error.errorAction === 'RECONNECT_REQUIRED')
  );

  if (authErrors.length === 0 && otherErrors.length === 0) return null;

  const handleReconnect = (platform) => {
    // This will redirect the user to reconnect their account
    const baseUrl = window.location.origin;
    
    // Get the JWT token from localStorage
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.error('No access token found. User needs to login first.');
      // Redirect to login page
      window.location.href = '/login';
      return;
    }
    
    // Map platforms to their correct OAuth endpoints and construct URLs with token
    let oauthUrl = '';
    
    switch (platform) {
      case 'youtube':
        oauthUrl = `${API_BASE_URL}/auth/youtube/login?token=${token}`;
        break;
      case 'facebook':
        oauthUrl = `${API_BASE_URL}/auth/facebook/login?token=${token}`;
        break;
      case 'twitter':
        oauthUrl = `${API_BASE_URL}/auth/twitter/login?token=${token}`;
        break;
      case 'mastodon':
        const instance = 'mastodon.social'; // Default instance
        oauthUrl = `${API_BASE_URL}/auth/mastodon/login?instance=${encodeURIComponent(instance)}&token=${token}`;
        break;
      case 'instagram':
        // Instagram requires Facebook connection first
        oauthUrl = `${API_BASE_URL}/auth/facebook/login?token=${token}`;
        break;
      case 'telegram':
        // Telegram also uses a different flow, redirect to manage accounts
        oauthUrl = `${baseUrl}/home/manage-accounts`;
        break;
      default:
        console.error(`No OAuth flow configured for platform: ${platform}`);
        return;
    }
    
    console.log(`Redirecting to OAuth URL: ${oauthUrl}`); // Debug log
    window.location.href = oauthUrl;
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 supports-[backdrop-filter]:backdrop-blur-sm supports-[backdrop-filter]:backdrop-saturate-150 transition-opacity duration-200 overflow-y-auto h-full w-full p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl ring-1 ring-black/5 max-w-md max-h-96 overflow-y-auto relative">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center mb-4">
            <FaExclamationTriangle className="text-yellow-500 text-2xl mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">
              {authErrors.length > 0 ? 'Authentication Required' : 'Posting Errors'}
            </h3>
          </div>

          {/* Authentication errors */}
          {authErrors.length > 0 && (
            <div className="mb-4">
              <p className="text-gray-600 mb-3">
                Your connection to the following platforms has expired. Please reconnect to continue posting:
              </p>
              <div className="space-y-3">
                {authErrors.map((error, index) => {
                  const PlatformIcon = platformIcons[error.platform] || FaPlug;
                  const platformColor = platformColors[error.platform] || 'text-gray-600';
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <PlatformIcon className={`${platformColor} text-lg mr-3`} />
                        <div>
                          <p className="font-medium text-gray-900 capitalize">{error.platform}</p>
                          <p className="text-sm text-gray-600">
                            {error.userFriendlyMessage || 'Session expired - please reconnect'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleReconnect(error.platform)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        Reconnect
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Other errors */}
          {otherErrors.length > 0 && (
            <div className="mb-4">
              {authErrors.length > 0 && (
                <h4 className="font-medium text-gray-900 mb-2">Other Issues:</h4>
              )}
              <div className="space-y-2">
                {otherErrors.map((error, index) => {
                  const PlatformIcon = platformIcons[error.platform] || FaPlug;
                  const platformColor = platformColors[error.platform] || 'text-gray-600';
                  
                  return (
                    <div key={index} className="flex items-center p-3 bg-red-50 rounded-lg">
                      <PlatformIcon className={`${platformColor} text-lg mr-3`} />
                      <div>
                        <p className="font-medium text-gray-900 capitalize">{error.platform}</p>
                        <p className="text-sm text-red-600">
                          {error.userFriendlyMessage || 
                           (typeof error.error === 'string' ? error.error : 
                            (error.error?.message || 'Unknown error'))}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            {authErrors.length === 0 && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                OK
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthErrorModal;
