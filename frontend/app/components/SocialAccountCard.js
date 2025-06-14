// components/SocialAccountCard.js
import Image from 'next/image';

export default function SocialAccountCard({ platform, IconComponent, connected, userProfilePic, onConnect }) {

  // Function to get the Tailwind CSS class for each platform's brand color
  const getPlatformColorClass = (platformName) => {
    switch (platformName) {
      case 'Facebook':
        return 'text-blue-600'; // Facebook Blue
      case 'Instagram':
        // Instagram's color is a gradient, but we can pick a representative purple/pink or simulate with a custom class/styling
        // For simplicity, let's use a vibrant purple, or you could create a gradient span in a more complex setup
        return 'text-pink-600'; // Instagram-like purple/pink
      case 'YouTube':
        return 'text-red-600'; // YouTube Red
      case 'TikTok':
        return 'text-black'; // TikTok uses black/white, depends on background. Let's make it black for now.
      case 'Twitter (X)':
        return 'text-black'; // Twitter/X brand color is typically black or dark blue
      default:
        return 'text-gray-800'; // Fallback color
    }
  };

  const iconColorClass = getPlatformColorClass(platform);

  return (
    <div className="border p-4 rounded-lg shadow-md flex flex-col items-center justify-between text-gray-800 min-h-[200px]">
      
      {/* Top section: App Icon on left, Button on right */}
      <div className="flex justify-between items-center w-full mb-4">
        {/* App Icon (Left) */}
        <div className="flex-shrink-0">
          {/* Apply the calculated iconColorClass here */}
          {IconComponent && <IconComponent size={36} className={iconColorClass} />}
        </div>

        {/* Connect/Disconnect Button (Right) */}
        <button
          onClick={onConnect}
          className={`px-3 py-1 rounded text-sm font-medium ${
            connected ? 'bg-gray-300 text-gray-700 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
          disabled={connected}
        >
          {connected ? 'Disconnect' : 'Connect'}
        </button>
      </div>

      {/* Middle section: User Profile Picture (conditional) */}
      {connected && userProfilePic ? (
        <div className="w-20 h-20 rounded-full overflow-hidden mb-3 shadow-lg flex-shrink-0">
          <Image
            src={userProfilePic}
            alt={`${platform} User Profile`}
            width={80}
            height={80}
            className="object-cover"
          />
        </div>
      ) : (
        // Placeholder to maintain consistent card height
        <div className="h-20 mb-3 flex-shrink-0 flex items-center justify-center">
            {/* Can add a generic placeholder icon here if needed */}
        </div>
      )}

      {/* Bottom section: Platform Name and Connection Status */}
      <div className="text-center w-full">
        <h3 className="text-xl font-semibold mb-1">{platform}</h3>
        <p className={`text-md ${connected ? 'text-green-600' : 'text-red-600'}`}>
          {connected ? 'Connected' : 'Not Connected'}
        </p>
      </div>
    </div>
  );
}