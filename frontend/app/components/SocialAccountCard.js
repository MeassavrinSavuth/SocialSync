import Image from 'next/image';
import { FaCheckCircle, FaTimesCircle, FaLink, FaTrash, FaCog } from 'react-icons/fa';
import { useState } from 'react';

const DEFAULT_AVATAR = '/default-avatar.png';

export default function SocialAccountCard({
  platform,
  IconComponent,
  connected,
  userProfilePic,
  accountName,
  accounts = [],
  onConnect,
  onRemoveAccount,
  onMakeDefault,
}) {
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);
  const [accountToRemove, setAccountToRemove] = useState(null);
  const [expandedAccounts, setExpandedAccounts] = useState(false);

  const getPlatformColorClass = (platformName) => {
    switch (platformName) {
      case 'Facebook':
        return 'bg-[#3b5998]';
      case 'Instagram':
        return 'bg-gradient-to-r from-pink-500 to-purple-600';
      case 'YouTube':
        return 'bg-red-600';
      case 'Twitter (X)':
        return 'bg-black';
      case 'Mastodon':
        return 'bg-[#6364FF]';
      case 'Telegram':
        return 'bg-[#0088CC]';
      default:
        return 'bg-gray-800';
    }
  };

  const iconBgClass = getPlatformColorClass(platform);
  const validProfilePic = userProfilePic && userProfilePic !== 'null' ? userProfilePic : DEFAULT_AVATAR;

  const handleRemoveClick = (accountId) => {
    setAccountToRemove(accountId);
    setShowConfirmRemove(true);
  };

  const handleConfirmRemove = () => {
    if (accountToRemove && onRemoveAccount) {
      onRemoveAccount(accountToRemove);
    }
    setShowConfirmRemove(false);
    setAccountToRemove(null);
  };

  const visibleAccounts = expandedAccounts ? accounts : accounts.slice(0, 2);
  const hasMoreAccounts = accounts.length > 2;

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5 md:p-6">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${iconBgClass}`}>
            {IconComponent && <IconComponent className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{platform}</h3>
            <div className="flex items-center gap-2">
              {connected ? (
                <>
                  <span className="text-xs text-green-600 font-medium">Connected</span>
                  <FaLink className="text-xs text-gray-400" />
                </>
              ) : (
                <span className="text-xs text-gray-500">Not connected</span>
              )}
            </div>
          </div>
        </div>
        {connected && (
          <div className="text-green-500">
            <FaCheckCircle className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Connected Accounts List */}
      {connected && accounts.length > 0 ? (
        <div className="flex-1 mb-4">
          <div className="space-y-2">
            {visibleAccounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <img 
                    src={account.avatar || DEFAULT_AVATAR} 
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
                <div className="flex items-center gap-1">
                  {!account.isDefault && (
                    <button
                      onClick={() => onMakeDefault && onMakeDefault(account.id)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Set as default"
                    >
                      <FaCog className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveClick(account.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                    title="Remove account"
                  >
                    <FaTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            
            {hasMoreAccounts && (
              <button
                onClick={() => setExpandedAccounts(!expandedAccounts)}
                className="w-full text-sm text-gray-600 hover:text-gray-900 py-2 transition-colors"
              >
                {expandedAccounts ? 'Show less' : `+ ${accounts.length - 2} more`}
              </button>
            )}
          </div>
        </div>
      ) : connected ? (
        <div className="flex-1 mb-4 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <FaTimesCircle className="text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No accounts found</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 mb-4 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
              {IconComponent && <IconComponent className="text-gray-400" />}
            </div>
            <p className="text-sm text-gray-500">No {platform} accounts connected</p>
            <p className="text-xs text-gray-400 mt-1">You'll be able to post and see analytics after connecting.</p>
          </div>
        </div>
      )}

      {/* Primary Action Button */}
      <button
        onClick={onConnect}
        className={`w-full py-3 px-4 rounded-xl font-medium text-sm transition-colors ${
          connected
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {connected ? 'Connect another' : 'Connect'}
      </button>

      {/* Remove Confirmation Modal */}
      {showConfirmRemove && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 supports-[backdrop-filter]:backdrop-blur-sm supports-[backdrop-filter]:backdrop-saturate-150 transition-opacity duration-200 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl ring-1 ring-black/5 p-6 max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove Account</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to remove this account? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmRemove(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemove}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}