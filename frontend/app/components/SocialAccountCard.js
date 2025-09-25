import Image from 'next/image';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const DEFAULT_AVATAR = '/default-avatar.png'; // Put a default image in your public folder

export default function SocialAccountCard({
  platform,
  IconComponent,
  connected,
  userProfilePic,
  accountName,
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
      case 'Twitter (X)':
        return 'bg-black';
      case 'Mastodon':
        return 'bg-[#6364FF]'
  // TikTok and Threads removed
      case 'Telegram':
        return 'bg-[#0088CC]';
      default:
        return 'bg-gray-800';
    }
  };

  const iconBgClass = getPlatformColorClass(platform);

  // Use fallback if null or empty string
  const validProfilePic = userProfilePic && userProfilePic !== 'null' ? userProfilePic : DEFAULT_AVATAR;

  return (
    <div className="relative w-full max-w-sm p-4 md:p-6 lg:p-8 rounded-2xl md:rounded-3xl shadow-lg md:shadow-2xl bg-white transition-all transform hover:scale-105 duration-300">
      {/* Status Icon - Mobile optimized */}
      <div className="absolute top-3 right-3 md:top-4 md:right-4 text-gray-400">
        {connected ? (
          <FaCheckCircle className="text-purple-500" size={18} />
        ) : (
          <FaTimesCircle className="text-gray-400" size={18} />
        )}
      </div>

      {connected ? (
        <div className="flex flex-col items-center justify-center mb-4 md:mb-6">
          <div className="flex items-center justify-center gap-2 md:gap-4 mb-2 md:mb-3">
            {/* Platform Icon - Mobile responsive */}
            <div className={`w-12 h-12 md:w-16 lg:w-20 md:h-16 lg:h-20 rounded-xl md:rounded-2xl flex items-center justify-center shadow-md text-white text-xl md:text-2xl lg:text-4xl ${iconBgClass}`}>
              {IconComponent && <IconComponent className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8" />}
            </div>

            {/* Emoji Link Icon - Mobile responsive */}
            <div className="text-lg md:text-2xl text-gray-400">🔗</div>

            {/* Profile Picture - Mobile responsive */}
            <div className="w-12 h-12 md:w-16 lg:w-20 md:h-16 lg:h-20 rounded-full overflow-hidden shadow-lg">
              <Image
                src={validProfilePic}
                alt={`${platform} Profile`}
                width={80}
                height={80}
                className="object-cover w-full h-full"
                priority={true}
                quality={100}
              />
            </div>
          </div>

          {/* Account Name - Mobile responsive */}
          {accountName && (
            <p className="text-xs md:text-sm text-gray-500 font-medium mt-1 text-center truncate max-w-full px-2">{accountName}</p>
          )}
        </div>
      ) : (
        <div className="w-12 h-12 md:w-16 lg:w-20 md:h-16 lg:h-20 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-md text-white text-xl md:text-2xl lg:text-4xl">
          <div className={`w-full h-full flex items-center justify-center rounded-xl md:rounded-2xl ${iconBgClass}`}>
            {IconComponent && <IconComponent className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8" />}
          </div>
        </div>
      )}

      <h3 className="text-center text-gray-800 font-semibold text-lg md:text-xl lg:text-2xl mb-4 md:mb-6 px-2">{platform}</h3>

      <button
        onClick={onConnect}
        className={`w-full py-2.5 md:py-3 rounded-lg md:rounded-xl text-white font-semibold text-sm md:text-base lg:text-lg transition-all min-h-[44px] ${
          connected
            ? 'bg-red-400 text-red-500 border border-red-200 cursor-pointer hover:bg-red-500 hover:text-white'
            : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
        }`}
      >
        {connected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  );
}