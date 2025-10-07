import { useState, useEffect } from 'react';
import { useProtectedFetch } from './useProtectedFetch';
import { useUser } from './useUser';

export function usePermissions(workspaceId) {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const protectedFetch = useProtectedFetch();
  const { profileData: currentUser } = useUser();

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    fetchPermissions();
  }, [workspaceId, fetchPermissions]);

  // Note: Real-time updates are now handled by the shared WebSocket context
  // in the components that use this hook, rather than creating individual connections

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response = await protectedFetch(`/workspaces/${workspaceId}/permissions`);
      
      if (response && response.permissions) {
        setPermissions(response.permissions);
      }
    } catch (err) {
      console.error('Error fetching permissions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission) => {
    return permissions.includes(permission) || 
           permissions.includes('workspace:delete'); // Workspace admins have all permissions
  };

  const hasAnyPermission = (...perms) => {
    return perms.some(perm => hasPermission(perm));
  };

  // Permission constants for easy use
  const PERMISSIONS = {
    // Workspace
    WORKSPACE_READ: 'workspace:read',
    WORKSPACE_UPDATE: 'workspace:update', 
    WORKSPACE_DELETE: 'workspace:delete',
    WORKSPACE_INVITE: 'workspace:invite',
    
    // Members
    MEMBER_READ: 'member:read',
    MEMBER_INVITE: 'member:invite',
    MEMBER_REMOVE: 'member:remove',
    MEMBER_ROLE_CHANGE: 'member:role_change',
    
    // Posts
    POST_CREATE: 'post:create',
    POST_READ: 'post:read',
    POST_UPDATE: 'post:update',
    POST_DELETE: 'post:delete',
    POST_PUBLISH: 'post:publish',
    POST_SCHEDULE: 'post:schedule',
    
    // Drafts
    DRAFT_CREATE: 'draft:create',
    DRAFT_READ: 'draft:read',
    DRAFT_UPDATE: 'draft:update',
    DRAFT_DELETE: 'draft:delete',
    
    // Analytics
    ANALYTICS_READ: 'analytics:read',
    ANALYTICS_EXPORT: 'analytics:export',
    ANALYTICS_ADVANCED: 'analytics:advanced',
    
    // Social accounts
    SOCIAL_CONNECT: 'social:connect',
    SOCIAL_DISCONNECT: 'social:disconnect',
    SOCIAL_READ: 'social:read',
    SOCIAL_POST: 'social:post',
    
    // Media
    MEDIA_UPLOAD: 'media:upload',
    MEDIA_DELETE: 'media:delete',
    MEDIA_READ: 'media:read',
    
    // Tasks
    TASK_CREATE: 'task:create',
    TASK_READ: 'task:read',
    TASK_UPDATE: 'task:update',
    TASK_DELETE: 'task:delete',
    TASK_COMMENT: 'task:comment',
  };

  return {
    permissions,
    loading,
    error,
    hasPermission,
    hasAnyPermission,
    PERMISSIONS,
    refetch: fetchPermissions
  };
}

// Helper hook for specific permission checks
export function useHasPermission(workspaceId, permission) {
  const { hasPermission, loading } = usePermissions(workspaceId);
  return { hasPermission: hasPermission(permission), loading };
}

// Helper hook for role-based UI rendering
export function useRoleBasedUI(workspaceId) {
  const { hasPermission, loading, PERMISSIONS, refetch: fetchPermissions } = usePermissions(workspaceId);
  const isAdmin = hasPermission(PERMISSIONS.WORKSPACE_DELETE);
  
  return {
    loading,
    canEdit: hasPermission(PERMISSIONS.POST_UPDATE) || hasPermission(PERMISSIONS.DRAFT_UPDATE),
    canDelete: hasPermission(PERMISSIONS.POST_DELETE) || hasPermission(PERMISSIONS.DRAFT_DELETE),
    canCreate: hasPermission(PERMISSIONS.POST_CREATE) || hasPermission(PERMISSIONS.DRAFT_CREATE),
    // Only admins can publish/post from draft menu (editor cannot)
    canPublish: isAdmin,
    canManageMembers: hasPermission(PERMISSIONS.MEMBER_ROLE_CHANGE),
    canInvite: hasPermission(PERMISSIONS.MEMBER_INVITE),
    canManageMedia: hasPermission(PERMISSIONS.MEDIA_DELETE),
    canViewAnalytics: hasPermission(PERMISSIONS.ANALYTICS_READ),
    // Task permissions
    canCreateTask: hasPermission(PERMISSIONS.TASK_CREATE),
    canUpdateTask: hasPermission(PERMISSIONS.TASK_UPDATE),
    canDeleteTask: hasPermission(PERMISSIONS.TASK_DELETE),
    canCommentOnTask: hasPermission(PERMISSIONS.TASK_COMMENT) || hasPermission(PERMISSIONS.WORKSPACE_READ),
    isAdmin,
    refetch: fetchPermissions
  };
}
