// components/LogoutConfirm.js
'use client';

import { useRouter } from 'next/navigation';

export default function LogoutConfirm({ onCancel }) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    router.push('/login');
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 supports-[backdrop-filter]:backdrop-blur-sm supports-[backdrop-filter]:backdrop-saturate-150 transition-opacity duration-200 animate-fade-in"
    style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl ring-1 ring-black/5 p-6 max-w-sm text-center">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Confirm Logout</h2>
        <p className="text-gray-600 mb-6">Are you sure you want to log out?</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
