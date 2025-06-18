import Image from 'next/image';
import { FaCheckCircle, FaTimesCircle, FaArrowRight } from 'react-icons/fa';

export default function SocialAccountCard({
  platform,
  IconComponent,
  connected,
  userProfilePic,
  accountName, // NEW: pass account name from parent
  onConnect,
}) {
  const getPlatformColorClass = (platformName) => {
    switch (platformName) {
      case 'Facebook':
        return 'bg-[#3b5998]';
      case 'Instagram':
        return 'bg-gradient-to-r from-pink-500 to-purple-600';
      case 'YouTube':
        return 'bg-red-600';
      case 'TikTok':
        return 'bg-black';
      case 'Twitter (X)':
        return 'bg-black';
      default:
        return 'bg-gray-800';
    }
  };

  const iconBgClass = getPlatformColorClass(platform);

  return (
    <div
      className={`relative w-full max-w-sm p-8 rounded-3xl shadow-2xl bg-white transition-all transform hover:scale-105 duration-300`}
    >
      {/* Status Icon */}
      <div className="absolute top-4 right-4 text-gray-400">
        {connected ? (
          <FaCheckCircle className="text-purple-500" size={22} />
        ) : (
          <FaTimesCircle className="text-gray-400" size={22} />
        )}
      </div>

      {/* Connected Layout: Icon + Link + Profile Picture */}
      {connected ? (
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="flex items-center justify-center gap-4 mb-3">
            {/* Platform Icon */}
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-md text-white text-4xl ${iconBgClass}`}>
              {IconComponent && <IconComponent size={28} />}
            </div>

            {/* Emoji Link Icon */}
            <div className="text-2xl text-gray-400">🔗</div>

            {/* Profile Picture */}
            <div className="w-20 h-20 rounded-full overflow-hidden shadow-lg">
              <Image
                src={userProfilePic}
                alt={`${platform} Profile`}
                width={80}
                height={80}
                className="object-cover"
              />
            </div>
          </div>

          {/* Account Name */}
          {accountName && (
            <p className="text-sm text-gray-500 font-medium mt-1">
              @{accountName}
            </p>
          )}
        </div>
      ) : (
        // Not connected: Show only platform icon centered
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md text-white text-4xl">
          <div className={`w-full h-full flex items-center justify-center rounded-2xl ${iconBgClass}`}>
            {IconComponent && <IconComponent size={32} />}
          </div>
        </div>
      )}

      {/* Platform Name */}
      <h3 className="text-center text-gray-800 font-semibold text-2xl mb-6">{platform}</h3>

      {/* Connect/Disconnect Button */}
      <button
        onClick={onConnect}
        disabled={connected}
        className={`w-full py-3 rounded-xl text-white font-semibold text-lg transition-all ${
          connected
            ? 'bg-red-400 text-red-500 border border-red-200 cursor-pointer hover:bg-red-300'
            : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
        }`}
      >
        {connected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  );
}
