'use client';

import React, { useState, useEffect } from 'react';
import { useSocialAccounts } from '../../hooks/api/useSocialAccounts';
import { FaFacebook, FaInstagram, FaYoutube, FaTwitter, FaTelegram } from 'react-icons/fa';
import { SiMastodon } from 'react-icons/si';

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', color: 'bg-[#3b5998]', icon: FaFacebook },
  { id: 'instagram', name: 'Instagram', color: 'bg-gradient-to-r from-pink-500 to-purple-600', icon: FaInstagram },
  { id: 'twitter', name: 'Twitter', color: 'bg-black', icon: FaTwitter },
  { id: 'youtube', name: 'YouTube', color: 'bg-red-600', icon: FaYoutube },
  { id: 'mastodon', name: 'Mastodon', color: 'bg-[#6364FF]', icon: SiMastodon },
  { id: 'telegram', name: 'Telegram', color: 'bg-[#0088CC]', icon: FaTelegram }
];

export default function AccountSelector({ selectedAccounts, onAccountChange }) {
  const { accounts: socialAccounts, loading } = useSocialAccounts();
  const [expandedAccounts, setExpandedAccounts] = useState({});

  // Group accounts by platform
  const accountsByPlatform = (socialAccounts || []).reduce((acc, account) => {
    const platform = account.platform || account.provider;
    if (!acc[platform]) acc[platform] = [];
    acc[platform].push(account);
    return acc;
  }, {});

  const handleAccountToggle = (accountId) => {
    // Find the account to check its platform
    const account = (socialAccounts || []).find(acc => acc.id === accountId);
    
    // Prevent selection of Twitter and Telegram accounts
    if (account && (account.platform === 'twitter' || account.platform === 'telegram')) {
      return;
    }
    
    const newSelection = selectedAccounts.includes(accountId)
      ? selectedAccounts.filter(id => id !== accountId)
      : [...selectedAccounts, accountId];
    
    onAccountChange(newSelection);
  };

  const handlePlatformToggle = (platformId) => {
    // Prevent selection of Twitter and Telegram
    if (platformId === 'twitter' || platformId === 'telegram') {
      return;
    }
    
    const platformAccounts = accountsByPlatform[platformId] || [];
    const platformAccountIds = platformAccounts.map(acc => acc.id);
    
    // Check if all accounts for this platform are selected
    const allSelected = platformAccountIds.every(id => selectedAccounts.includes(id));
    
    if (allSelected) {
      // Deselect all accounts for this platform
      const newSelection = selectedAccounts.filter(id => !platformAccountIds.includes(id));
      onAccountChange(newSelection);
    } else {
      // Select all accounts for this platform
      const newSelection = [...new Set([...selectedAccounts, ...platformAccountIds])];
      onAccountChange(newSelection);
    }
  };

  const handleSelectAll = () => {
    const allAccountIds = (socialAccounts || [])
      .filter(acc => acc.platform !== 'twitter' && acc.platform !== 'telegram')
      .map(acc => acc.id);
    onAccountChange(allAccountIds);
  };

  const handleClearAll = () => {
    onAccountChange([]);
  };

  const toggleAccountExpansion = (platformId) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [platformId]: !prev[platformId]
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Select Accounts for Analytics</h3>
          <div className="flex gap-2">
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">Select All</button>
            <span className="text-gray-300">|</span>
            <button className="text-sm text-gray-600 hover:text-gray-800 font-medium">Clear All</button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-80 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const connectedPlatforms = PLATFORMS.filter(platform => 
    accountsByPlatform[platform.id] && accountsByPlatform[platform.id].length > 0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Select Accounts for Analytics</h3>
          <p className="text-sm text-gray-600 mt-1">Choose which accounts to include in your analytics</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Select All
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={handleClearAll}
            className="text-sm text-gray-600 hover:text-gray-800 font-medium"
          >
            Clear All
          </button>
        </div>
      </div>

      {connectedPlatforms.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No connected accounts found</h3>
          <p className="text-gray-600 mb-4">Connect accounts in Manage Accounts to see analytics</p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Go to Manage Accounts
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {connectedPlatforms.map((platform) => {
            const platformAccounts = accountsByPlatform[platform.id] || [];
            const platformAccountIds = platformAccounts.map(acc => acc.id);
            const allSelected = platformAccountIds.every(id => selectedAccounts.includes(id));
            const someSelected = platformAccountIds.some(id => selectedAccounts.includes(id));
            const isExpanded = expandedAccounts[platform.id];
            const IconComponent = platform.icon;

            return (
              <div key={platform.id} className="h-full flex flex-col bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5 md:p-6">
                {/* Platform Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${platform.color}`}>
                      {IconComponent && <IconComponent className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{platform.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-green-600 font-medium">Connected</span>
                        <span className="text-xs text-gray-500">
                          {platformAccounts.length} account{platformAccounts.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={input => {
                        if (input) input.indeterminate = someSelected && !allSelected;
                      }}
                      onChange={() => handlePlatformToggle(platform.id)}
                      disabled={platform.id === 'twitter' || platform.id === 'telegram'}
                      className={`w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 ${
                        platform.id === 'twitter' || platform.id === 'telegram' 
                          ? 'opacity-50 cursor-not-allowed' 
                          : ''
                      }`}
                    />
                    <span className={`text-xs ${
                      platform.id === 'twitter' || platform.id === 'telegram' 
                        ? 'text-gray-400' 
                        : 'text-gray-500'
                    }`}>
                      {platform.id === 'twitter' || platform.id === 'telegram' 
                        ? 'Disabled' 
                        : someSelected 
                          ? `${platformAccountIds.filter(id => selectedAccounts.includes(id)).length}/${platformAccounts.length}` 
                          : '0'
                      }/{platformAccounts.length}
                    </span>
                  </div>
                </div>

                {/* Platform-specific limitations */}
                {platform.id === 'twitter' && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 text-red-600 mt-0.5">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-red-800">Analytics Not Available</p>
                        <p className="text-xs text-red-700 mt-1">
                          Twitter analytics are disabled due to API rate limits. This platform cannot be selected for analytics.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {platform.id === 'telegram' && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 text-red-600 mt-0.5">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-red-800">Analytics Not Available</p>
                        <p className="text-xs text-red-700 mt-1">
                          Telegram is a chat platform. Analytics are not available for chat messages.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Connected Accounts List */}
                <div className="flex-1 mb-4">
                  <div className="space-y-2">
                    {platformAccounts.slice(0, isExpanded ? platformAccounts.length : 2).map((account) => (
                      <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <img 
                            src={account.avatar || '/default-avatar.png'} 
                            alt={account.displayName || account.profileName || 'account'} 
                            className="w-10 h-10 rounded-full object-cover" 
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {account.displayName || account.profileName || account.externalId}
                            </div>
                            {account.isDefault && (
                              <span className="text-xs text-blue-600 font-medium">Default</span>
                            )}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedAccounts.includes(account.id)}
                          onChange={() => handleAccountToggle(account.id)}
                          disabled={platform.id === 'twitter' || platform.id === 'telegram'}
                          className={`w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 ${
                            platform.id === 'twitter' || platform.id === 'telegram' 
                              ? 'opacity-50 cursor-not-allowed' 
                              : ''
                          }`}
                        />
                      </div>
                    ))}
                    
                    {platformAccounts.length > 2 && (
                      <button
                        onClick={() => toggleAccountExpansion(platform.id)}
                        className="w-full text-sm text-gray-600 hover:text-gray-900 py-2 transition-colors"
                      >
                        {isExpanded ? 'Show less' : `+ ${platformAccounts.length - 2} more`}
                      </button>
                    )}
                  </div>
                </div>

                {/* Platform Selection Status */}
                <div className="mt-auto">
                  <div className={`text-center py-2 px-3 rounded-lg text-sm font-medium ${
                    platform.id === 'twitter' || platform.id === 'telegram'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : allSelected 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : someSelected 
                          ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                          : 'bg-gray-50 text-gray-700 border border-gray-200'
                  }`}>
                    {platform.id === 'twitter' || platform.id === 'telegram'
                      ? 'Analytics disabled'
                      : allSelected 
                        ? `All ${platform.name} accounts selected` 
                        : someSelected 
                          ? `${platformAccountIds.filter(id => selectedAccounts.includes(id)).length} of ${platformAccounts.length} selected`
                          : 'No accounts selected'
                    }
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedAccounts.length > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">
                {selectedAccounts.length} account{selectedAccounts.length !== 1 ? 's' : ''} selected for analytics
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Analytics will show data from these accounts only
              </p>
            </div>
            <button
              onClick={handleClearAll}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
