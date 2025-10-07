'use client';

import React, { useEffect } from 'react';
import { useRoleBasedUI } from '../../hooks/auth/usePermissions';
import { useWebSocket } from '../../contexts/WebSocketContext';

export default function MemberList({
  showMemberList,
  setShowMemberList,
  members,
  membersLoading,
  membersError,
  currentUser,
  selectedWorkspace,
  roleChangeLoading,
  onRoleChange,
  onLeaveWorkspace,
  onRemoveMember,
  onRefreshMembers
}) {
  // Permission checks
  const { canManageMembers, loading: permissionsLoading } = useRoleBasedUI(selectedWorkspace?.id);
  
  // Use shared WebSocket connection for real-time member updates
  const { subscribe } = useWebSocket();

  // Subscribe to WebSocket messages for real-time member updates
  useEffect(() => {
    const unsubscribe = subscribe((msg) => {
      console.log('MemberList received WebSocket message:', msg);
      
      if (msg.type === 'member_role_changed' && msg.user_id && msg.role) {
        // Optimistically reflect role change without refetch
        if (onRefreshMembers) {
          // Still allow a background refresh, but UI should already be updated by hook
          onRefreshMembers();
        }
      } else if (msg.type === 'member_removed' && msg.user_id) {
        if (onRefreshMembers) {
          onRefreshMembers();
        }
      } else if (msg.type === 'member_added') {
        if (onRefreshMembers) {
          onRefreshMembers();
        }
      }
    });

    return unsubscribe;
  }, [subscribe, onRefreshMembers]);
  if (!showMemberList) {
    return (
      <div className="mb-3 md:mb-4">
        <button
          className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gray-100 text-gray-800 rounded-lg font-semibold hover:bg-gray-200 transition border border-gray-300 text-sm md:text-base min-h-[44px]"
          onClick={() => setShowMemberList(true)}
        >
          Member List
          <span className="transform transition-transform">{'>'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-3 md:mb-4">
      <button
        className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gray-100 text-gray-800 rounded-lg font-semibold hover:bg-gray-200 transition border border-gray-300 text-sm md:text-base min-h-[44px]"
        onClick={() => setShowMemberList(false)}
      >
        Member List
        <span className="transform transition-transform rotate-90">{'>'}</span>
      </button>
      
      <div className="mt-2 rounded-2xl ring-1 ring-black/5 bg-white shadow-sm p-5 md:p-6 w-full max-w-2xl overflow-x-auto">
        {/* Header Bar */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Members</h3>
          <p className="text-sm text-gray-700 mt-1">Manage roles and remove members.</p>
        </div>

        {membersLoading ? (
          <div className="text-center text-gray-500 py-4 text-sm">Loading members...</div>
        ) : membersError ? (
          <div className="text-center text-red-500 py-4 text-sm">Error loading members: {membersError}</div>
        ) : members.length === 0 ? (
          <div className="rounded-xl bg-gray-50 text-gray-500 text-sm px-4 py-8 text-center">No members found</div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-3">
              {members.map((m, i) => {
                const isCurrentUser = m.id === currentUser.id;
                const isAdmin = selectedWorkspace.admin_id === currentUser.id;
                const isMemberAdmin = m.role === 'Admin';
                const validRoles = ['Admin', 'Editor', 'Viewer'];
                const safeRole = validRoles.includes(m.role) ? m.role : 'Viewer';
                
                return (
                  <div key={m.id} className="bg-gray-50 rounded-lg p-3 border">
                    <div className="flex items-center gap-3 mb-2">
                      <img 
                        src={m.avatar || '/default-avatar.png'} 
                        alt={m.name} 
                        className="w-10 h-10 rounded-full ring-1 ring-black/5 object-cover bg-gray-100" 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{m.name}</div>
                        {m.email && (
                          <div className="text-sm text-gray-600 truncate">{m.email}</div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {isAdmin && !isCurrentUser && !isMemberAdmin && m.role !== 'Admin' ? (
                            <div className="relative inline-flex">
                              <select
                                className="appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-8 py-1.5 text-sm text-gray-900 shadow-sm hover:border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600 ring-offset-2"
                                value={safeRole}
                                onChange={e => onRoleChange(m.id, e.target.value)}
                                disabled={roleChangeLoading[m.id]}
                              >
                                <option value="Editor">Editor</option>
                                <option value="Viewer">Viewer</option>
                              </select>
                              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-200 text-xs px-2.5 py-1">
                              {m.role}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        {isCurrentUser ? (
                          !isMemberAdmin && (
                            <button
                              onClick={onLeaveWorkspace}
                              className="rounded-xl bg-red-50 text-red-600 ring-1 ring-red-200 px-3 py-1.5 text-sm hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-500 ring-offset-2"
                            >
                              Leave
                            </button>
                          )
                        ) : (
                          isAdmin && !isMemberAdmin && (
                            <button
                              onClick={() => onRemoveMember(m.id, m.name)}
                              className="rounded-xl bg-red-50 text-red-600 ring-1 ring-red-200 px-3 py-1.5 text-sm hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-500 ring-offset-2"
                            >
                              Remove
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Profile</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Role</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m, i) => {
                    const isCurrentUser = m.id === currentUser.id;
                    const isAdmin = selectedWorkspace.admin_id === currentUser.id;
                    const isMemberAdmin = m.role === 'Admin';
                    const validRoles = ['Admin', 'Editor', 'Viewer'];
                    const safeRole = validRoles.includes(m.role) ? m.role : 'Viewer';
                    
                    return (
                      <tr
                        key={m.id}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70 transition-colors"
                      >
                        <td className="px-4 py-4 align-middle">
                          <img 
                            src={m.avatar || '/default-avatar.png'} 
                            alt={m.name} 
                            className="w-10 h-10 rounded-full ring-1 ring-black/5 object-cover bg-gray-100" 
                          />
                        </td>
                        <td className="px-4 py-4 align-middle min-w-0">
                          <div className="font-medium text-gray-900 truncate">{m.name}</div>
                          {m.email && (
                            <div className="text-sm text-gray-600 truncate">{m.email}</div>
                          )}
                        </td>
                        <td className="px-4 py-4 align-middle">
                          {canManageMembers && !isCurrentUser && !isMemberAdmin && m.role !== 'Admin' ? (
                            <div className="relative inline-flex">
                              <select
                                className="appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-8 py-1.5 text-sm text-gray-900 shadow-sm hover:border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600 ring-offset-2"
                                value={safeRole}
                                onChange={e => onRoleChange(m.id, e.target.value)}
                                disabled={roleChangeLoading[m.id]}
                              >
                                <option value="Editor">Editor</option>
                                <option value="Viewer">Viewer</option>
                              </select>
                              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-200 text-xs px-2.5 py-1">
                              {m.role}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <div className="flex justify-end">
                            {isCurrentUser ? (
                              !isMemberAdmin && (
                                <button
                                  onClick={onLeaveWorkspace}
                                  className="rounded-xl bg-red-50 text-red-600 ring-1 ring-red-200 px-3 py-1.5 text-sm hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-500 ring-offset-2"
                                >
                                  Leave
                                </button>
                              )
                            ) : (
                              canManageMembers && !isMemberAdmin && (
                                <button
                                  onClick={() => onRemoveMember(m.id, m.name)}
                                  className="rounded-xl bg-red-50 text-red-600 ring-1 ring-red-200 px-3 py-1.5 text-sm hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-500 ring-offset-2"
                                >
                                  Remove
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 