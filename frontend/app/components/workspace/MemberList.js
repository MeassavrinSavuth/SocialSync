'use client';

import React from 'react';

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
  onRemoveMember
}) {
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
      
      <div className="mt-2 bg-white rounded-xl md:rounded-2xl shadow-xl p-3 md:p-4 border w-full max-w-2xl overflow-x-auto">
        {membersLoading ? (
          <div className="text-center text-gray-500 py-4 text-sm md:text-base">Loading members...</div>
        ) : membersError ? (
          <div className="text-center text-red-500 py-4 text-sm md:text-base">Error loading members: {membersError}</div>
        ) : members.length === 0 ? (
          <div className="text-center text-gray-500 py-4 text-sm md:text-base">No members found</div>
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
                        className="w-10 h-10 rounded-full border object-cover bg-gray-100" 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{m.name}</div>
                        <div className="flex items-center gap-2">
                          {isAdmin && !isCurrentUser && !isMemberAdmin ? (
                            <select
                              className={`px-2 py-1 rounded border text-xs font-semibold transition-colors duration-200
                                ${safeRole === 'Admin' ? 'text-blue-700 bg-blue-50' : safeRole === 'Editor' ? 'text-green-700 bg-green-50' : 'text-gray-700 bg-gray-50'}`}
                              value={safeRole}
                              onChange={e => onRoleChange(m.id, e.target.value)}
                              disabled={roleChangeLoading[m.id]}
                            >
                              <option value="Admin">Admin</option>
                              <option value="Editor">Editor</option>
                              <option value="Viewer">Viewer</option>
                            </select>
                          ) : (
                            <span className={
                              m.role === 'Admin'
                                ? 'bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold'
                                : m.role === 'Editor'
                                ? 'bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold'
                                : 'bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-semibold'
                            }>
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
                              className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition min-h-[32px]"
                            >
                              Leave
                            </button>
                          )
                        ) : (
                          isAdmin && !isMemberAdmin && (
                            <button
                              onClick={() => onRemoveMember(m.id, m.name)}
                              className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition min-h-[32px]"
                            >
                              Kick
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
                  <tr className="border-b">
                    <th className="py-2 px-2 font-semibold text-gray-700">Profile</th>
                    <th className="py-2 px-2 font-semibold text-gray-700">Name</th>
                    <th className="py-2 px-2 font-semibold text-gray-700">Role</th>
                    <th className="py-2 px-2 font-semibold text-gray-700">Actions</th>
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
                        className={`border-b transition-colors ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50`}
                      >
                        <td className="py-2 px-2">
                          <img 
                            src={m.avatar || '/default-avatar.png'} 
                            alt={m.name} 
                            className="w-10 h-10 rounded-full border object-cover bg-gray-100" 
                          />
                        </td>
                        <td className="py-2 px-2 text-gray-800 font-medium text-base">{m.name}</td>
                        <td className="py-2 px-2">
                          {isAdmin && !isCurrentUser && !isMemberAdmin ? (
                            <select
                              className={`px-2 py-1 rounded border text-xs font-semibold transition-colors duration-200
                                ${safeRole === 'Admin' ? 'text-blue-700 bg-blue-50' : safeRole === 'Editor' ? 'text-green-700 bg-green-50' : 'text-gray-700 bg-gray-50'}`}
                              value={safeRole}
                              onChange={e => onRoleChange(m.id, e.target.value)}
                              disabled={roleChangeLoading[m.id]}
                            >
                              <option value="Admin">Admin</option>
                              <option value="Editor">Editor</option>
                              <option value="Viewer">Viewer</option>
                            </select>
                          ) : (
                            <span className={
                              m.role === 'Admin'
                                ? 'bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold'
                                : m.role === 'Editor'
                                ? 'bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold'
                                : 'bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold'
                            }>
                              {m.role}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          {isCurrentUser ? (
                            !isMemberAdmin && (
                              <button
                                onClick={onLeaveWorkspace}
                                className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition"
                              >
                                Leave
                              </button>
                            )
                          ) : (
                            isAdmin && !isMemberAdmin && (
                              <button
                                onClick={() => onRemoveMember(m.id, m.name)}
                                className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition"
                              >
                                Kick
                              </button>
                            )
                          )}
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