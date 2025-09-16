"use client";

import React, { useState, useRef, useEffect } from 'react';
import { FaBell } from 'react-icons/fa';
import WorkspaceCard from './WorkspaceCard';
import ConfirmModal from './ConfirmModal';
import InviteModal from './InviteModal';

export default function WorkspaceDashboard({
  workspaces,
  loading,
  error,
  currentUser,
  invitations,
  showCreateModal,
  setShowCreateModal,
  showInvitesModal,
  setShowInvitesModal,
  onEnterWorkspace,
  onDeleteWorkspace,
  onCreateWorkspace,
  deleteWorkspaceId,
  setDeleteWorkspaceId,
  confirmDeleteWorkspace,
  newWorkspaceName,
  setNewWorkspaceName,
  newWorkspaceAvatar,
  setNewWorkspaceAvatar,
  onAcceptInvitation,
  onDeclineInvitation,
  invitationsLoading
}) {
  const uploadControllerRef = useRef(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [avatarFileSelected, setAvatarFileSelected] = useState(false);

  useEffect(() => {
    if (!showCreateModal && uploadControllerRef.current) {
      // abort in-progress upload when modal closes
      try {
        uploadControllerRef.current.abort();
      } catch (e) {
        // ignore
      }
      uploadControllerRef.current = null;
      setAvatarUploading(false);
      setUploadProgress(0);
      setAvatarFileSelected(false);
    }
  }, [showCreateModal]);

  const handleAvatarChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadError(null);
      setAvatarFileSelected(true);
      setAvatarUploading(true);
      setUploadProgress(0);

      // abort previous controller if any
      if (uploadControllerRef.current) {
        try { uploadControllerRef.current.abort(); } catch (err) {}
        uploadControllerRef.current = null;
      }

      const controller = new AbortController();
      uploadControllerRef.current = controller;

      try {
        const { uploadToCloudinary } = await import('../../hooks/api/uploadToCloudinary');
        const url = await uploadToCloudinary(file, (percent) => {
          setUploadProgress(percent);
        }, controller.signal);

        setNewWorkspaceAvatar(url);
        setUploadProgress(100);
        setAvatarFileSelected(false);
      } catch (err) {
        if (err && err.name === 'AbortError') {
          setUploadError('Upload cancelled');
        } else {
          setUploadError(err?.message || 'Upload failed');
        }
        // ensure avatar URL is cleared on failure
        setNewWorkspaceAvatar('');
      } finally {
        setAvatarUploading(false);
        uploadControllerRef.current = null;
      }
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 md:mb-8 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Your Workspaces</h1>
        <div className="flex items-center gap-3 md:gap-4 justify-end">
          <button
            className="relative focus:outline-none p-2 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => {
              console.log('Bell clicked!');
              setShowInvitesModal(true);
            }}
            aria-label="View Invitations"
          >
            <FaBell className="text-xl md:text-2xl text-gray-600 hover:text-blue-600 transition" />
            {Array.isArray(invitations) && invitations.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold animate-pulse min-w-[20px] text-center">
                {invitations.length}
              </span>
            )}
          </button>
          <button
            className="py-2 px-4 md:px-6 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-sm md:text-base whitespace-nowrap"
            onClick={() => setShowCreateModal(true)}
          >
            <span className="hidden sm:inline">+ Create Workspace</span>
            <span className="sm:hidden">+ Create</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-500">Loading workspaces...</div>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="text-red-500">Error loading workspaces: {error}</div>
        </div>
      ) : (
        <>
          {/* Intro / help card to fill whitespace - Mobile optimized */}
          <div className="mb-4 md:mb-6 bg-white rounded-xl md:rounded-2xl shadow p-4 md:p-6">
            <div className="max-w-2xl">
              <h2 className="text-base md:text-lg font-semibold text-gray-800">Workspaces — where your team plans and publishes</h2>
              <p className="mt-2 text-sm md:text-base text-gray-600">Create a workspace to organize projects, invite teammates, and manage posts and media in one place. Think of a workspace as a shared folder for a brand or campaign.</p>
              <ul className="mt-3 text-gray-600 list-disc list-inside text-xs md:text-sm space-y-1">
                <li>Switch between workspaces for different clients, brands, or channels.</li>
                <li>Invite teammates and control who can post or edit.</li>
                <li>Prepare drafts and attachments, review with your team, then publish when ready.</li>
              </ul>
              <p className="mt-3 text-xs md:text-sm text-gray-500">Tip: Add an avatar so your team recognizes the workspace quickly.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
            {Array.isArray(workspaces) && workspaces.map((ws) => (
              <WorkspaceCard
                key={ws.id}
                avatar={ws.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg'}
                name={ws.name}
                admin={ws.admin_name}
                onClick={() => onEnterWorkspace(ws)}
                isAdmin={ws.admin_id === currentUser?.id}
                onDelete={() => onDeleteWorkspace(ws.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Delete Workspace Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteWorkspaceId}
        title="Delete Workspace"
        message="Are you sure you want to delete this workspace? This action cannot be undone."
        onConfirm={confirmDeleteWorkspace}
        onCancel={() => setDeleteWorkspaceId(null)}
      />

      {/* Create Workspace Modal - Mobile optimized */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl md:text-2xl font-bold mb-4 text-gray-800">Create Workspace</h2>
            <form onSubmit={onCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Workspace Name</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 text-black"
                  value={newWorkspaceName}
                  onChange={e => setNewWorkspaceName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-blue-600 font-semibold mb-1">Workspace avatar (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full border rounded px-3 py-2 text-black"
                  onChange={handleAvatarChange}
                />

                {/* Progress / preview area */}
                <div className="mt-3">
                  {avatarUploading ? (
                    <div className="space-y-2">
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-3 bg-blue-600 rounded-full transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <div className="text-sm text-gray-600">Uploading avatar… {uploadProgress}%</div>
                    </div>
                  ) : newWorkspaceAvatar ? (
                    <img src={newWorkspaceAvatar} alt="Avatar Preview" className="mt-2 w-16 h-16 rounded-full object-cover border" />
                  ) : uploadError ? (
                    <div className="text-sm text-red-500">{uploadError}</div>
                  ) : (
                    <div className="text-sm text-gray-500">Optional avatar helps teammates recognize this workspace.</div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className={`flex-1 py-2 px-4 rounded font-semibold transition ${avatarUploading || (avatarFileSelected && !newWorkspaceAvatar) ? 'bg-gray-300 text-gray-700 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  disabled={avatarUploading || (avatarFileSelected && !newWorkspaceAvatar)}
                >
                  {avatarUploading ? 'Uploading…' : 'Create Workspace'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded font-semibold hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>

              {/* helper when avatar is still uploading */}
              {(avatarUploading || (avatarFileSelected && !newWorkspaceAvatar)) && (
                <div className="mt-3 text-sm text-gray-600">You can create the workspace after the avatar finishes uploading.</div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Invitations Modal */}
      <InviteModal
        open={showInvitesModal}
        onClose={() => {
          console.log('InviteModal closed');
          setShowInvitesModal(false);
        }}
        invitations={invitations}
        onAccept={onAcceptInvitation}
        onDecline={onDeclineInvitation}
        loading={invitationsLoading}
      />
    </div>
  );
} 