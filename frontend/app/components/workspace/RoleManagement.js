'use client';

import React, { useState, useEffect } from 'react';
import { useProtectedFetch } from '../../hooks/auth/useProtectedFetch';

const ROLE_DESCRIPTIONS = {
  workspace_admin: {
    name: 'Workspace Admin',
    description: 'Full administrative access including member management and workspace settings',
    color: 'bg-red-100 text-red-800 border-red-200',
    permissions: ['All permissions']
  },
  content_manager: {
    name: 'Content Manager', 
    description: 'Manage all content creation, editing, publishing, and scheduling',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    permissions: ['Create/Edit Posts', 'Schedule Posts', 'Manage Drafts', 'View Analytics', 'Upload Media']
  },
  social_manager: {
    name: 'Social Manager',
    description: 'Manage social media accounts and connections with limited content access',
    color: 'bg-green-100 text-green-800 border-green-200', 
    permissions: ['Connect Social Accounts', 'Post to Social', 'Create Content', 'View Analytics']
  },
  analyst: {
    name: 'Analyst',
    description: 'View and analyze performance data with read-only content access',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    permissions: ['View Analytics', 'Export Reports', 'Advanced Analytics', 'Read-only Content']
  },
  contributor: {
    name: 'Contributor',
    description: 'Create and edit content with limited publishing capabilities',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    permissions: ['Create Content', 'Edit Drafts', 'Basic Analytics', 'Upload Media']
  },
  viewer: {
    name: 'Viewer',
    description: 'Read-only access to workspace content and basic analytics',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    permissions: ['View Content', 'Basic Analytics', 'Read-only Access']
  }
};

export default function RoleManagement({ 
  workspaceId, 
  members, 
  currentUser, 
  onRoleChange,
  canManageRoles = false 
}) {
  const protectedFetch = useProtectedFetch();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [userPermissions, setUserPermissions] = useState([]);

  useEffect(() => {
    if (workspaceId) {
      fetchRoles();
      fetchUserPermissions();
    }
  }, [workspaceId]);

  const fetchRoles = async () => {
    try {
      const response = await protectedFetch(`/workspaces/${workspaceId}/roles`);
      if (response) {
        setRoles(response);
      }
    } catch (err) {
      setError('Failed to fetch roles');
      console.error('Error fetching roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPermissions = async () => {
    try {
      const response = await protectedFetch(`/workspaces/${workspaceId}/permissions`);
      if (response && response.permissions) {
        setUserPermissions(response.permissions);
      }
    } catch (err) {
      console.error('Error fetching user permissions:', err);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      const response = await protectedFetch(`/workspaces/${workspaceId}/members/${memberId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response) {
        onRoleChange && onRoleChange(memberId, newRole);
        setShowRoleModal(false);
        setSelectedMember(null);
      }
    } catch (err) {
      setError('Failed to update role');
      console.error('Error updating role:', err);
    }
  };

  const openRoleModal = (member) => {
    setSelectedMember(member);
    setShowRoleModal(true);
  };

  const hasPermission = (permission) => {
    return userPermissions.includes(permission) || 
           userPermissions.includes('workspace:delete'); // Workspace admins have all permissions
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Role Management</h3>
        <p className="text-sm text-gray-600 mt-1">
          Manage team member roles and permissions
        </p>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Role Descriptions */}
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Available Roles</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(ROLE_DESCRIPTIONS).map(([roleKey, roleInfo]) => (
              <div key={roleKey} className={`p-3 rounded-lg border ${roleInfo.color}`}>
                <div className="font-medium text-sm mb-1">{roleInfo.name}</div>
                <div className="text-xs mb-2 opacity-90">{roleInfo.description}</div>
                <div className="text-xs">
                  <strong>Permissions:</strong> {roleInfo.permissions.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Member List with Roles */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Team Members</h4>
          <div className="space-y-2">
            {members.map((member) => {
              const roleInfo = ROLE_DESCRIPTIONS[member.role] || ROLE_DESCRIPTIONS.viewer;
              const isCurrentUser = member.id === currentUser.id;
              const canChangeThisRole = canManageRoles && !isCurrentUser && 
                                       hasPermission('member:role_change');

              return (
                <div key={member.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={member.avatar || '/default-avatar.png'} 
                      alt={member.name}
                      className="w-10 h-10 rounded-full border object-cover"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        {member.name}
                        {isCurrentUser && <span className="text-sm text-gray-500 ml-2">(You)</span>}
                      </div>
                      <div className="text-sm text-gray-600">{member.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${roleInfo.color}`}>
                      {roleInfo.name}
                    </span>
                    
                    {canChangeThisRole && (
                      <button
                        onClick={() => openRoleModal(member)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Change Role
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Role Change Modal */}
      {showRoleModal && selectedMember && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 supports-[backdrop-filter]:backdrop-blur-sm supports-[backdrop-filter]:backdrop-saturate-150 transition-opacity duration-200">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl ring-1 ring-black/5 p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Change Role for {selectedMember.name}
            </h3>
            
            <div className="space-y-3 mb-6">
              {Object.entries(ROLE_DESCRIPTIONS).map(([roleKey, roleInfo]) => {
                const isCurrentRole = selectedMember.role === roleKey;
                
                return (
                  <button
                    key={roleKey}
                    onClick={() => handleRoleChange(selectedMember.id, roleKey)}
                    disabled={isCurrentRole}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isCurrentRole 
                        ? `${roleInfo.color} opacity-50 cursor-not-allowed`
                        : `hover:${roleInfo.color} border-gray-200 hover:border-opacity-50`
                    }`}
                  >
                    <div className="font-medium text-sm mb-1">
                      {roleInfo.name}
                      {isCurrentRole && <span className="ml-2 text-xs">(Current)</span>}
                    </div>
                    <div className="text-xs opacity-90">{roleInfo.description}</div>
                  </button>
                );
              })}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedMember(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}