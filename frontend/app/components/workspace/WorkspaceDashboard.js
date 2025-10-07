"use client";

import React, { useState, useRef, useEffect } from 'react';
import { FaBell } from 'react-icons/fa';
import { useWebSocket } from '../../contexts/WebSocketContext';
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Your Workspaces</h1>
            <p className="text-sm text-gray-600">Manage your team workspaces and collaborate on projects</p>
          </div>
          <div className="flex items-center gap-3 md:gap-4 justify-end">
            <button
              className="relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ring-offset-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => {
                if (process.env.NODE_ENV !== 'production') {
                  console.log('Bell clicked!');
                }
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
              className="rounded-xl bg-blue-600 text-white px-4 py-2 font-medium shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition text-sm md:text-base whitespace-nowrap"
              onClick={() => setShowCreateModal(true)}
            >
              <span className="hidden sm:inline">+ Create Workspace</span>
              <span className="sm:hidden">+ Create</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="text-sm text-muted-foreground">Loading workspaces...</div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-500">Error loading workspaces: {error}</div>
          </div>
        ) : (
          <>
            {/* Intro / help card to fill whitespace - Mobile optimized */}
            <div className="rounded-3xl ring-1 ring-black/5 bg-white shadow-sm overflow-hidden relative">
              <div className="bg-gradient-to-br from-blue-50/40 via-white to-violet-50/40 p-6 md:p-8">
                <div className="max-w-3xl">
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">Organize team projects</h2>
                  <p className="mt-3 text-lg text-gray-600">Create workspaces to manage posts, invite teammates, and publish content together.</p>
                  <ul className="mt-5 space-y-2">
                    <li className="flex items-start gap-3 text-gray-700">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Switch between client workspaces instantly
                    </li>
                    <li className="flex items-start gap-3 text-gray-700">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Invite teammates with custom permissions
                    </li>
                    <li className="flex items-start gap-3 text-gray-700">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Draft content and review before publishing
                    </li>
                  </ul>
                  <div className="mt-6 rounded-2xl bg-blue-50/70 text-blue-800 px-4 py-3 ring-1 ring-blue-200 text-sm">
                    Add an avatar so your team recognizes this workspace quickly.
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
      </div>

      {/* Delete Workspace Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteWorkspaceId}
        title="Delete Workspace"
        message="Are you sure you want to delete this workspace? This action cannot be undone."
        onConfirm={confirmDeleteWorkspace}
        onCancel={() => setDeleteWorkspaceId(null)}
      />

      {/* Create Workspace Modal - Mobile optimized */}
      {/* Create Workspace Modal - Updated */}
{showCreateModal && (
  <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-6 md:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-gray-800">Create Workspace</h2>
      <form onSubmit={onCreateWorkspace} className="space-y-4">
        <div>
          <label className="block text-gray-700 font-semibold mb-1">Workspace Name</label>
          <input
            type="text"
            className="w-full border rounded-xl px-3 py-2 text-black focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
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
            className="w-full border rounded-xl px-3 py-2 text-black focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
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
            className={`flex-1 py-2 px-4 rounded-xl font-medium shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${avatarUploading || (avatarFileSelected && !newWorkspaceAvatar) ? 'bg-gray-300 text-gray-700 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            disabled={avatarUploading || (avatarFileSelected && !newWorkspaceAvatar)}
          >
            {avatarUploading ? 'Uploading…' : 'Create Workspace'}
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(false)}
            className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium shadow-sm hover:bg-gray-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
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
          if (process.env.NODE_ENV !== 'production') {
            console.log('InviteModal closed');
          }
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