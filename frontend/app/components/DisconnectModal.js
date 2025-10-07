// components/DisconnectModal.js
import React from 'react';

export default function DisconnectModal({ show, onClose, onConfirm, platformName }) {
  if (!show) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/50 supports-[backdrop-filter]:backdrop-blur-sm supports-[backdrop-filter]:backdrop-saturate-150 transition-opacity duration-200"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }} // Keeping the working RGBA background for the overlay
    >
      {/* Modal content container */}
      <div
        // --- KEY CHANGE HERE ---
        // Changed bg-white to bg-gray-100 for a softer, less white background
        className="w-full max-w-3xl rounded-2xl bg-white shadow-xl ring-1 ring-black/5 p-8 max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-gray-900 mb-4">Confirm Disconnection</h2>
        <p className="text-gray-700 mb-6">
          Are you sure you want to disconnect your <span className="font-semibold">{platformName}</span> account? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 transition duration-150"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-400 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition duration-150"
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}