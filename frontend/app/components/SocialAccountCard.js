// components/SocialAccountCard.js
import Image from 'next/image';

export default function SocialAccountCard({
  platform,
  IconComponent,
  connected,
  userProfilePic,
  onConnect,
}) {
  const getPlatformColorClass = (platformName) => {
    switch (platformName) {
      case 'Facebook':
        return 'text-blue-600';
      case 'Instagram':
        return 'text-pink-500';
      case 'YouTube':
        return 'text-red-600';
      case 'TikTok':
        return 'text-black';
      case 'Twitter (X)':
        return 'text-black';
      default:
        return 'text-gray-800';
    }
  };

  const iconColorClass = getPlatformColorClass(platform);

  return (
    <div className="border p-4 rounded-lg shadow-md flex flex-col items-center justify-between text-gray-800 min-h-[220px]">
      {/* Top: Platform Icon & Connect Button */}
      <div className="flex justify-between items-center w-full mb-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          {IconComponent && <IconComponent size={32} className={iconColorClass} />}
        </div>

        {/* Button */}
        <button
          onClick={onConnect}
          disabled={connected}
          className={`px-3 py-1 rounded text-sm font-medium ${
            connected
              ? 'bg-gray-300 text-gray-700 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {connected ? 'Connected' : 'Connect'}
        </button>
      </div>

      {/* Profile Picture */}
      <div className="mb-3">
        {connected && userProfilePic ? (
          <div className="w-20 h-20 rounded-full overflow-hidden shadow-md">
            <Image
              src={userProfilePic}
              alt={`${platform} Profile`}
              width={80}
              height={80}
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-400 border">
            No Photo
          </div>
        )}
      </div>

      {/* Platform Name & Status */}
      <div className="text-center w-full">
        <h3 className="text-lg font-semibold mb-1">{platform}</h3>
        <p className={connected ? 'text-green-600' : 'text-red-600'}>
          {connected ? 'Connected' : 'Not Connected'}
        </p>
      </div>
    </div>
  );
}
