import { useState, useEffect } from 'react';
import { FaCheckCircle, FaTimesCircle, FaLink, FaCog } from 'react-icons/fa';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://socialsync-j7ih.onrender.com';

export default function AccountSelector({ 
  platform, 
  IconComponent, 
  onAccountSelect, 
  selectedAccountIds = [], // Always multi-select
  className = "" 
}) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const getPlatformColorClass = (platformKey) => {
    switch (platformKey) {
      case 'facebook':
        return 'bg-[#3b5998]';
      case 'instagram':
        return 'bg-gradient-to-r from-pink-500 to-purple-600';
      case 'youtube':
        return 'bg-red-600';
      case 'twitter':
        return 'bg-black';
      case 'mastodon':
        return 'bg-[#6364FF]';
      case 'telegram':
        return 'bg-[#0088CC]';
      default:
        return 'bg-gray-800';
    }
  };

  const getPlatformDisplayName = (platformKey) => {
    switch (platformKey) {
      case 'facebook':
        return 'Facebook';
      case 'instagram':
        return 'Instagram';
      case 'youtube':
        return 'YouTube';
      case 'twitter':
        return 'Twitter (X)';
      case 'mastodon':
        return 'Mastodon';
      case 'telegram':
        return 'Telegram';
      default:
        return platformKey;
    }
  };

  const iconBgClass = getPlatformColorClass(platform);
  const displayName = getPlatformDisplayName(platform);

  useEffect(() => {
    // Reset state when platform changes
    setAccounts([]);
    setError(null);
    setLoading(true);
    fetchAccounts();
  }, [platform]);

  const fetchAccounts = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('Access token not found.');
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get(`${API_BASE_URL}/api/social-accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const allAccounts = Array.isArray(res.data) ? res.data : [];
      
      // Filter accounts for this platform
      const platformAccounts = allAccounts.filter(account => {
        const provider = (account.provider || account.platform || '').toLowerCase();
        const platformKey = platform.toLowerCase();
        return provider === platformKey;
      });

      setAccounts(platformAccounts);
      setError(null);
      
      // Auto-select default account if none selected
      if (platformAccounts.length > 0 && selectedAccountIds.length === 0) {
        const defaultAccount = platformAccounts.find(acc => acc.isDefault) || platformAccounts[0];
        console.log('AccountSelector auto-selecting default account:', {
          id: defaultAccount.id,
          displayName: defaultAccount.displayName,
          profileName: defaultAccount.profileName,
          platform: defaultAccount.platform,
          provider: defaultAccount.provider
        });
        
        // Validate account has required properties
        if (defaultAccount && defaultAccount.id) {
          onAccountSelect([defaultAccount]); // Pass full account object, not just ID
        } else {
          console.error('Invalid default account - missing id:', defaultAccount);
          setError('Account configuration error. Please reconnect your account.');
        }
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError('Failed to fetch accounts.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountClick = (account) => {
    // Always multi-select mode: toggle account in selection
    const isSelected = selectedAccountIds.includes(account.id);
    let newSelection;
    
    if (isSelected) {
      // Remove from selection
      newSelection = selectedAccountIds.filter(id => id !== account.id);
      console.log(`AccountSelector: Deselected account ${account.displayName || account.profileName} (${account.id})`);
    } else {
      // Add to selection
      newSelection = [...selectedAccountIds, account.id];
      console.log(`AccountSelector: Selected account ${account.displayName || account.profileName} (${account.id})`);
    }
    
    // Pass the full account objects instead of just IDs
    const selectedAccountObjects = accounts.filter(acc => newSelection.includes(acc.id));
    console.log(`AccountSelector: Total selected accounts: ${selectedAccountObjects.length}`, selectedAccountObjects.map(a => a.displayName || a.profileName));
    onAccountSelect(selectedAccountObjects);
  };

  const selectedAccounts = accounts.filter(acc => selectedAccountIds.includes(acc.id));

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error || accounts.length === 0) {
    return (
      <div className={`bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${iconBgClass}`}>
            {IconComponent && <IconComponent className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{displayName}</h3>
            <p className="text-sm text-gray-500">
              {error || `No ${displayName} accounts connected`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${iconBgClass}`}>
            {IconComponent && <IconComponent className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{displayName}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-600 font-medium">Connected</span>
              <FaLink className="text-xs text-gray-400" />
            </div>
          </div>
        </div>
        <div className="text-green-500">
          <FaCheckCircle className="w-5 h-5" />
        </div>
      </div>

      {/* Account Selection */}
      <div className="space-y-2">
        {/* Account List - Always show all accounts */}
        <div className="space-y-1">
          {accounts.map((account) => {
            const isSelected = selectedAccountIds.includes(account.id);
            
            return (
              <div
                key={account.id}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => handleAccountClick(account)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <img 
                    src={account.avatar || '/default-avatar.png'} 
                    alt={account.displayName || account.profileName || 'account'} 
                    className="w-8 h-8 rounded-full object-cover" 
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
