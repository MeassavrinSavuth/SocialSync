import React, { useState, useEffect } from 'react';
import { FaTimes, FaFacebookF, FaInstagram, FaTwitter, FaYoutube, FaMastodon, FaTelegramPlane } from 'react-icons/fa';

const platformIcons = {
  facebook: FaFacebookF,
  instagram: FaInstagram,
  twitter: FaTwitter,
  youtube: FaYoutube,
  mastodon: FaMastodon,
  telegram: FaTelegramPlane,
};

const platformColors = {
  facebook: 'text-blue-600',
  instagram: 'text-pink-600',
  twitter: 'text-sky-600',
  youtube: 'text-red-600',
  mastodon: 'text-purple-600',
  telegram: 'text-cyan-600',
};

const platformBorders = {
  facebook: 'border-blue-200 ring-blue-100',
  instagram: 'border-pink-200 ring-pink-100',
  twitter: 'border-sky-200 ring-sky-100',
  youtube: 'border-red-200 ring-red-100',
  mastodon: 'border-purple-200 ring-purple-100',
  telegram: 'border-cyan-200 ring-cyan-100',
};

export default function PostSelectionModal({ isOpen, onClose, draft, onPost, workspaceId }) {
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [accountsByPlatform, setAccountsByPlatform] = useState({});
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [youtubePrivacy, setYoutubePrivacy] = useState('private'); // 'private' or 'public'

  // Use only the platforms that were selected when the draft was created
  const availablePlatforms = draft?.platforms || [];
  console.log('Draft platforms:', draft?.platforms);
  console.log('Available platforms:', availablePlatforms);

  useEffect(() => {
    if (isOpen) {
      // Initialize with draft's platforms
      setSelectedPlatforms(draft?.platforms || []);
      fetchAccounts();
    }
  }, [isOpen, draft]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://socialsync-j7ih.onrender.com'}/api/social-accounts`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched accounts data:', data);
        
        // Process accounts by platform
        const accountsByPlatform = {};
        if (Array.isArray(data)) {
          data.forEach(account => {
            console.log('Processing account:', account);
            const platform = account.platform;
            console.log('Account platform:', platform);
            if (!accountsByPlatform[platform]) {
              accountsByPlatform[platform] = [];
            }
            
            // Use the same field structure as manage accounts page
            let accountName = account.name || 
                              account.displayName || 
                              account.profileName || 
                              account.externalId ||
                              account.page_name ||
                              account.display_name ||
                              account.username;
            
            // If we still have a UUID-like string, try to extract a better name
            if (accountName && accountName.length > 20 && accountName.includes('-')) {
              // Try to use other fields that might have better names
              accountName = account.displayName || 
                           account.profileName || 
                           account.username || 
                           `Facebook Page ${accountsByPlatform[platform].length + 1}`;
            }
            
            // Final fallback - show the ID if nothing else is available
            if (!accountName) {
              accountName = account.id || `Facebook Page ${accountsByPlatform[platform].length + 1}`;
            }
            
            console.log('Account name resolved to:', accountName);
            console.log('All account fields:', Object.keys(account));
            console.log('Raw account data:', account);
            
            accountsByPlatform[platform].push({
              name: accountName,
              username: account.username || account.social_id || account.page_id || account.external_account_id || '',
              avatar: account.avatar || '/default-avatar.png',
              id: account.id,
              social_id: account.social_id,
              platform: account.platform || platform
            });
          });
        }
        console.log('Processed accounts by platform:', accountsByPlatform);
        console.log('Available platforms:', Object.keys(accountsByPlatform));
        
        // No demo accounts - only show real accounts from API
        
        setAccountsByPlatform(accountsByPlatform);
      } else {
        // If backend is not available, show empty accounts
        console.warn('Backend not available, no accounts loaded');
        setError('Failed to load accounts. Please check your connection.');
        setAccountsByPlatform({});
      }
    } catch (err) {
      // If backend is not available, show empty accounts
      console.warn('Backend not available, no accounts loaded');
      setError('Failed to load accounts. Please check your connection.');
      setAccountsByPlatform({});
    } finally {
      setLoading(false);
    }
  };

  // No need for togglePlatform since we use draft platforms directly

  const toggleAccount = (account) => {
    setSelectedAccounts(prev => {
      const isSelected = prev.some(selected => selected.id === account.id);
      console.log(`Toggling account ${account.name} (ID: ${account.id}), currently selected: ${isSelected}`);
      if (isSelected) {
        const newSelection = prev.filter(selected => selected.id !== account.id);
        console.log('Removed account, new selection:', newSelection.map(acc => `${acc.name} (${acc.id})`));
        return newSelection;
      } else {
        const newSelection = [...prev, account];
        console.log('Added account, new selection:', newSelection.map(acc => `${acc.name} (${acc.id})`));
        return newSelection;
      }
    });
  };

  // Calculate total selected accounts - just count the selectedAccounts array
  const totalSelectedAccounts = selectedAccounts.length;

  const handlePost = async () => {
    if (availablePlatforms.length === 0) {
      setError('No platforms available for this draft');
      return;
    }

    if (selectedAccounts.length === 0) {
      setError('Please select at least one account to post to');
      return;
    }

    // Validate content requirements for each platform
    const validationErrors = [];
    
    // Check if any YouTube accounts are selected but no video content
    const hasYouTubeAccounts = selectedAccounts.some(account => account.platform === 'youtube');
    const hasVideoContent = draft.media && draft.media.some(mediaUrl => {
      const extension = mediaUrl.split('.').pop().toLowerCase();
      return ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm', 'mkv'].includes(extension);
    });
    
    if (hasYouTubeAccounts && !hasVideoContent) {
      validationErrors.push('YouTube requires video content. Please add a video to your draft.');
    }
    
    // Check if any Instagram accounts are selected but no media content
    const hasInstagramAccounts = selectedAccounts.some(account => account.platform === 'instagram');
    const hasMediaContent = draft.media && draft.media.length > 0;
    
    if (hasInstagramAccounts && !hasMediaContent) {
      validationErrors.push('Instagram requires media content (image or video). Please add media to your draft.');
    }
    
    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n\n'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Prepare post data - use selected accounts grouped by platform
      const accountsByPlatform = {};
      console.log('Selected accounts before grouping:', selectedAccounts);
      selectedAccounts.forEach(account => {
        const platform = account.platform || 'facebook';
        console.log(`Grouping account ${account.name} (ID: ${account.id}) under platform: ${platform}`);
        if (!accountsByPlatform[platform]) {
          accountsByPlatform[platform] = [];
        }
        accountsByPlatform[platform].push(account);
      });
      console.log('Grouped accounts by platform:', accountsByPlatform);

      const postData = {
        platforms: availablePlatforms,
        accounts: accountsByPlatform, // All selected accounts grouped by platform
        draftId: draft.id,
        youtubePrivacy: youtubePrivacy, // Include YouTube privacy setting
      };

      await onPost(postData);
      onClose();
    } catch (err) {
      setError('Failed to post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 supports-[backdrop-filter]:backdrop-blur-sm supports-[backdrop-filter]:backdrop-saturate-150 transition-opacity duration-200">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl ring-1 ring-black/5 mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Post Draft</h2>
            <p className="text-sm text-gray-600 mt-1">Select accounts for the platforms in this draft</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-2"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Platform Selection - Show only draft platforms */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Draft Platforms</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availablePlatforms.map((platform) => {
                const Icon = platformIcons[platform];
                const hasAccounts = accountsByPlatform[platform] && accountsByPlatform[platform].length > 0;
                
                return (
                  <div
                    key={platform}
                    className={`p-4 rounded-xl border-2 ${
                      hasAccounts 
                        ? 'border-green-200 bg-green-50 ring-2 ring-green-200' 
                        : 'border-gray-100 bg-gray-50 opacity-50'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <Icon className={`w-6 h-6 ${platformColors[platform]}`} />
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {platform}
                      </span>
                      {hasAccounts ? (
                        <span className="text-xs text-green-600 font-medium">
                          {accountsByPlatform[platform].length} account{accountsByPlatform[platform].length !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">No accounts</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Account Selection for Draft Platforms */}
          {availablePlatforms.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Select Accounts</h3>
              {availablePlatforms.map((platform) => {
                const accounts = accountsByPlatform[platform] || [];
                const Icon = platformIcons[platform];
                
                return (
                  <div key={platform} className={`p-4 rounded-xl border ${platformBorders[platform]} ring-1`}>
                    <div className="flex items-center space-x-3 mb-3">
                      <Icon className={`w-5 h-5 ${platformColors[platform]}`} />
                      <h4 className="font-medium text-gray-900 capitalize">{platform}</h4>
                    </div>
                    
                    {accounts.length > 0 ? (
                      <div className="space-y-2">
                        {/* YouTube Privacy Selector */}
                        {platform === 'youtube' && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Privacy Setting
                            </label>
                            <div className="flex space-x-4">
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name="youtubePrivacy"
                                  value="private"
                                  checked={youtubePrivacy === 'private'}
                                  onChange={(e) => setYoutubePrivacy(e.target.value)}
                                  className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">Private</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name="youtubePrivacy"
                                  value="public"
                                  checked={youtubePrivacy === 'public'}
                                  onChange={(e) => setYoutubePrivacy(e.target.value)}
                                  className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                                />
                                <span className="ml-2 text-sm text-gray-700">Public</span>
                              </label>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {youtubePrivacy === 'private' 
                                ? 'Video will be private and only visible to you' 
                                : 'Video will be public and visible to everyone'}
                            </p>
                          </div>
                        )}
                        
                        {accounts.map((account, index) => {
                          const isSelected = selectedAccounts.some(selected => selected.id === account.id);
                          // Check content requirements
                          const hasVideoContent = draft.media && draft.media.some(mediaUrl => {
                            const extension = mediaUrl.split('.').pop().toLowerCase();
                            return ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm', 'mkv'].includes(extension);
                          });
                          const hasMediaContent = draft.media && draft.media.length > 0;
                          
                          const isYouTubeWithoutVideo = account.platform === 'youtube' && !hasVideoContent;
                          const isInstagramWithoutMedia = account.platform === 'instagram' && !hasMediaContent;
                          const isDisabled = isYouTubeWithoutVideo || isInstagramWithoutMedia;
                          
                          let warningMessage = '';
                          if (isYouTubeWithoutVideo) {
                            warningMessage = 'YouTube requires video content';
                          } else if (isInstagramWithoutMedia) {
                            warningMessage = 'Instagram requires media content';
                          }
                          
                          return (
                            <label key={index} className={`flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer ${isDisabled ? 'opacity-50' : ''}`}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => !isDisabled && toggleAccount(account)}
                                disabled={isDisabled}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:cursor-not-allowed"
                              />
                              <div className="flex items-center space-x-3 flex-1">
                                <img 
                                  src={account.avatar || '/default-avatar.png'} 
                                  alt={account.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">{account.name}</p>
                                  <p className="text-xs text-gray-500">{account.username || account.social_id || account.page_id || ''}</p>
                                  {warningMessage && (
                                    <p className="text-xs text-red-500 mt-1">{warningMessage}</p>
                                  )}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No accounts available for this platform</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handlePost}
            disabled={availablePlatforms.length === 0 || selectedAccounts.length === 0 || loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Posting...' : `Post to ${totalSelectedAccounts} account${totalSelectedAccounts !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
