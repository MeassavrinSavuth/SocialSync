import React, { useState } from 'react';

export default function InviteMemberModal({ open, onClose, onInvite, loading = false, error = null }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Editor');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) {
      onInvite(email, role);
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('Editor');
    onClose();
  };

  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 supports-[backdrop-filter]:backdrop-blur-sm supports-[backdrop-filter]:backdrop-saturate-150 transition-opacity duration-200 p-4 pointer-events-none">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl ring-1 ring-black/5 p-6 md:p-8 max-w-md max-h-[90vh] overflow-y-auto relative pointer-events-auto">
        <h2 className="text-xl md:text-2xl font-bold mb-4 text-gray-900">Invite Member</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-1 text-sm md:text-base">Email Address</label>
            <input
              type="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm md:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-gray-900 placeholder-gray-500"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter email address"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-1 text-sm md:text-base">Role</label>
            <select
              className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm md:text-base transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white
                ${role === 'Admin' ? 'text-blue-700' : role === 'Editor' ? 'text-green-700' : 'text-gray-700'}`}
              value={role}
              onChange={e => setRole(e.target.value)}
              disabled={loading}
            >
              <option value="Editor">Editor</option>
              <option value="Viewer">Viewer</option>
              <option value="Admin">Admin</option>
            </select>
            <p className="text-xs md:text-sm text-gray-500 mt-1">
              {role === 'Admin' && 'Can manage workspace and members'}
              {role === 'Editor' && 'Can create and edit content'}
              {role === 'Viewer' && 'Can view content only'}
            </p>
          </div>
          {error && (
            <div className="text-red-500 text-xs md:text-sm bg-red-50 p-3 rounded-lg border border-red-200">
              <div className="font-semibold mb-1">Invitation Error:</div>
              {error}
            </div>
          )}
          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors text-sm md:text-base min-h-[44px] border border-gray-300"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm md:text-base min-h-[44px] border border-blue-600"
              disabled={loading || !email.trim()}
            >
              {loading ? 'Sending...' : 'Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 