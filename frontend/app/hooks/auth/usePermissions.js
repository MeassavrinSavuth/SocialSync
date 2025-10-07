import { useState, useEffect, useCallback, useRef } from 'react';
import { useProtectedFetch } from './useProtectedFetch';
import { useUser } from './useUser';

// Global, per-workspace request coordination to avoid refetch storms
const inFlightByWorkspace = new Map(); // workspaceId -> Promise
const lastFetchAtByWorkspace = new Map(); // workspaceId -> timestamp ms
const MIN_FETCH_INTERVAL_MS = 600; // coalesce bursts within this window

export function usePermissions(workspaceId) {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const protectedFetch = useProtectedFetch();
  const { profileData: currentUser } = useUser();
  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const fetchPermissions = useCallback(async (force = false) => {
    try {
      if (!workspaceId) return;

      const now = Date.now();
      const lastAt = lastFetchAtByWorkspace.get(workspaceId) || 0;

      // If there's an in-flight request for this workspace, await it and return
      if (inFlightByWorkspace.has(workspaceId)) {
        await inFlightByWorkspace.get(workspaceId);
        return;
      }

      // If fetched very recently, skip to avoid hammering the API
      // But allow immediate refetch if permissions are empty (first load or after role change)
      if (!force && now - lastAt < MIN_FETCH_INTERVAL_MS && permissions.length > 0) {
        return;
      }

      // Mark loading only when we actually issue a request
      if (isMounted.current) setLoading(true);

      const p = (async () => {
        try {
          const response = await protectedFetch(`/workspaces/${workspaceId}/permissions`);
          if (response && response.permissions && isMounted.current) {
            setPermissions(response.permissions);
            setError(null);
          }
        } finally {
          lastFetchAtByWorkspace.set(workspaceId, Date.now());
          inFlightByWorkspace.delete(workspaceId);
          if (isMounted.current) setLoading(false);
        }
      })();
      inFlightByWorkspace.set(workspaceId, p);
      await p;
    } catch (err) {
      console.error('Error fetching permissions:', err);
      setError(err.message);
    }
  }, [workspaceId, protectedFetch]);

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      setPermissions([]); // Clear permissions when no workspace
      return;
    }

    // Clear permissions when workspace changes to avoid stale data
    setPermissions([]);
    fetchPermissions();
  }, [workspaceId, fetchPermissions]);

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
    canCreate: hasPermission(PERMISSIONS.POST_CREATE) || hasPermission(PERMISSIONS.DRAFT_CREATE) || hasPermission(PERMISSIONS.TASK_CREATE),
    // Only admins can publish/post from draft menu (editor cannot)
    canPublish: isAdmin,
    canManageMembers: hasPermission(PERMISSIONS.MEMBER_ROLE_CHANGE),
    canInvite: hasPermission(PERMISSIONS.MEMBER_INVITE),
    canManageMedia: hasPermission(PERMISSIONS.MEDIA_DELETE),
    canViewAnalytics: hasPermission(PERMISSIONS.ANALYTICS_READ),
    // Task permissions
  canCreateTask: hasPermission(PERMISSIONS.TASK_CREATE) || hasPermission(PERMISSIONS.POST_CREATE),
  canUpdateTask: hasPermission(PERMISSIONS.TASK_UPDATE) || hasPermission(PERMISSIONS.POST_UPDATE),
  canDeleteTask: hasPermission(PERMISSIONS.TASK_DELETE) || hasPermission(PERMISSIONS.POST_DELETE),
    canCommentOnTask: hasPermission(PERMISSIONS.TASK_COMMENT) || hasPermission(PERMISSIONS.WORKSPACE_READ),
    isAdmin,
    refetch: fetchPermissions
  };
}
