'use client';

import React from 'react';
import Image from 'next/image';
import { FaUserPlus, FaArrowLeft } from 'react-icons/fa';
import InviteMemberModal from './InviteMemberModal';

export default function WorkspaceHeader({ 
  workspace, 
  currentUser, 
  onBack, 
  onInviteMember, 
  inviteLoading, 
  inviteError,
  showInviteMemberModal,
  setShowInviteMemberModal,
  onOpenInviteMemberModal
}) {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={onBack}
            aria-label="Back to Workspaces"
          >
            <FaArrowLeft className="text-sm md:text-base" />
          </button>
          <Image 
            src={workspace.avatar} 
            alt={workspace.name} 
            width={56}
            height={56}
            className="w-12 h-12 md:w-14 md:h-14 rounded-full border object-cover bg-gray-100" 
          />
          <div className="min-w-0 flex-1">
            <div className="text-xl md:text-2xl font-bold text-gray-800 truncate">{workspace.name}</div>
            <div className="text-gray-500 text-xs md:text-sm">
              Admin: <span className="font-medium">{workspace.admin_name}</span>
            </div>
          </div>
        </div>
        
        {/* Only admin can invite - Mobile optimized */}
        {workspace.admin_id === currentUser.id && (
          <button
            className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-sm md:text-base whitespace-nowrap min-h-[44px]"
            onClick={onOpenInviteMemberModal || (() => setShowInviteMemberModal(true))}
          >
            <FaUserPlus className="text-sm md:text-base" /> 
            <span className="hidden sm:inline">Invite Member</span>
            <span className="sm:hidden">Invite</span>
          </button>
        )}
      </div>

      <InviteMemberModal
        open={showInviteMemberModal}
        onClose={() => setShowInviteMemberModal(false)}
        onInvite={onInviteMember}
        loading={inviteLoading}
        error={inviteError}
      />
    </>
  );
} 