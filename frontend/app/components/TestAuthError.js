// Test component to verify AuthErrorModal functionality
'use client';

import { useState } from 'react';
import AuthErrorModal from './AuthErrorModal';

const TestAuthError = () => {
  const [showModal, setShowModal] = useState(false);
  const [errors] = useState([
    {
      platform: 'youtube',
      success: false,
      error: 'Authentication expired',
      errorType: 'AUTH_EXPIRED',
      errorAction: 'RECONNECT_REQUIRED',
      userFriendlyMessage: 'Your YouTube connection has expired. Please reconnect to continue posting.'
    }
  ]);

  return (
    <div className="p-4">
      <button
        onClick={() => setShowModal(true)}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        Test YouTube Auth Error
      </button>

      <AuthErrorModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        errors={errors}
        onReconnect={() => setShowModal(false)}
      />
    </div>
  );
};

export default TestAuthError;
