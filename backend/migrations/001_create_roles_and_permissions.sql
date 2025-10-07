-- Migration: Enhanced Role-Based Access Control System
-- This migration creates a comprehensive RBAC system for SocialSync

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT false,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create permissions table for reference
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL, -- e.g., 'posts', 'workspace', 'analytics'
    action VARCHAR(50) NOT NULL,   -- e.g., 'create', 'read', 'update', 'delete'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workspace_user_permissions for custom permissions
CREATE TABLE IF NOT EXISTS workspace_user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- Create social_account_permissions for granular social media access
CREATE TABLE IF NOT EXISTS social_account_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    permissions TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id, user_id, social_account_id)
);

-- Insert default permissions
INSERT INTO permissions (name, description, resource, action) VALUES
-- Workspace permissions
('workspace:read', 'View workspace information and settings', 'workspace', 'read'),
('workspace:update', 'Edit workspace settings and information', 'workspace', 'update'),
('workspace:delete', 'Delete the workspace', 'workspace', 'delete'),
('workspace:invite', 'Invite new members to the workspace', 'workspace', 'invite'),

-- Member management permissions
('member:read', 'View workspace members and their roles', 'member', 'read'),
('member:invite', 'Invite new members to the workspace', 'member', 'invite'),
('member:remove', 'Remove members from the workspace', 'member', 'remove'),
('member:role_change', 'Change member roles and permissions', 'member', 'role_change'),

-- Content permissions
('post:create', 'Create new social media posts', 'post', 'create'),
('post:read', 'View social media posts and content', 'post', 'read'),
('post:update', 'Edit existing social media posts', 'post', 'update'),
('post:delete', 'Delete social media posts', 'post', 'delete'),
('post:publish', 'Publish posts to social media platforms', 'post', 'publish'),
('post:schedule', 'Schedule posts for future publishing', 'post', 'schedule'),

-- Draft permissions
('draft:create', 'Create draft posts', 'draft', 'create'),
('draft:read', 'View draft posts', 'draft', 'read'),
('draft:update', 'Edit draft posts', 'draft', 'update'),
('draft:delete', 'Delete draft posts', 'draft', 'delete'),

-- Analytics permissions
('analytics:read', 'View analytics and performance data', 'analytics', 'read'),
('analytics:export', 'Export analytics data and reports', 'analytics', 'export'),
('analytics:advanced', 'Access advanced analytics features', 'analytics', 'advanced'),

-- Social account permissions
('social:connect', 'Connect new social media accounts', 'social', 'connect'),
('social:disconnect', 'Disconnect social media accounts', 'social', 'disconnect'),
('social:read', 'View connected social media accounts', 'social', 'read'),
('social:post', 'Post to connected social media accounts', 'social', 'post'),

-- Media permissions
('media:upload', 'Upload media files', 'media', 'upload'),
('media:delete', 'Delete media files', 'media', 'delete'),
('media:read', 'View media files', 'media', 'read')

ON CONFLICT (name) DO NOTHING;

-- Insert default system roles with their permissions
INSERT INTO roles (name, description, is_system_role, permissions) VALUES
('workspace_admin', 
 'Full administrative access to the workspace including member management, settings, and all content operations',
 true,
 '["workspace:read", "workspace:update", "workspace:delete", "workspace:invite", "member:read", "member:invite", "member:remove", "member:role_change", "post:create", "post:read", "post:update", "post:delete", "post:publish", "post:schedule", "draft:create", "draft:read", "draft:update", "draft:delete", "analytics:read", "analytics:export", "analytics:advanced", "social:connect", "social:disconnect", "social:read", "social:post", "media:upload", "media:delete", "media:read"]'::jsonb),

('content_manager',
 'Manage all content creation, editing, publishing, and scheduling across all social media platforms',
 true,
 '["workspace:read", "member:read", "post:create", "post:read", "post:update", "post:delete", "post:publish", "post:schedule", "draft:create", "draft:read", "draft:update", "draft:delete", "analytics:read", "analytics:export", "social:read", "social:post", "media:upload", "media:delete", "media:read"]'::jsonb),

('social_manager',
 'Manage social media accounts, connections, and posting with limited content management access',
 true,
 '["workspace:read", "member:read", "post:create", "post:read", "post:update", "post:publish", "draft:create", "draft:read", "draft:update", "analytics:read", "social:connect", "social:disconnect", "social:read", "social:post", "media:upload", "media:read"]'::jsonb),

('analyst',
 'View and analyze performance data, generate reports, with read-only access to content',
 true,
 '["workspace:read", "member:read", "post:read", "draft:read", "analytics:read", "analytics:export", "analytics:advanced", "social:read", "media:read"]'::jsonb),

('contributor',
 'Create and edit content, limited publishing capabilities, contribute to team projects',
 true,
 '["workspace:read", "member:read", "post:create", "post:read", "post:update", "draft:create", "draft:read", "draft:update", "draft:delete", "analytics:read", "social:read", "social:post", "media:upload", "media:read"]'::jsonb),

('viewer',
 'Read-only access to workspace content, analytics, and social media data',
 true,
 '["workspace:read", "member:read", "post:read", "draft:read", "analytics:read", "social:read", "media:read"]'::jsonb)

ON CONFLICT (name) DO NOTHING;

-- Update existing workspace_members table to support new role system
-- First, let's see what roles currently exist and map them to new system
DO $$
BEGIN
    -- Update existing 'Admin' roles to 'workspace_admin'
    UPDATE workspace_members SET role = 'workspace_admin' WHERE role = 'Admin';
    
    -- Update existing 'Editor' roles to 'content_manager' 
    UPDATE workspace_members SET role = 'content_manager' WHERE role = 'Editor';
    
    -- Update existing 'Viewer' roles to 'viewer'
    UPDATE workspace_members SET role = 'viewer' WHERE role = 'Viewer';
    
    -- Any other roles default to 'contributor'
    UPDATE workspace_members SET role = 'contributor' 
    WHERE role NOT IN ('workspace_admin', 'content_manager', 'viewer');
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_user_permissions_workspace_user 
ON workspace_user_permissions(workspace_id, user_id);

CREATE INDEX IF NOT EXISTS idx_social_account_permissions_workspace_user 
ON social_account_permissions(workspace_id, user_id);

CREATE INDEX IF NOT EXISTS idx_social_account_permissions_platform 
ON social_account_permissions(platform);

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspace_user_permissions_updated_at BEFORE UPDATE ON workspace_user_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_account_permissions_updated_at BEFORE UPDATE ON social_account_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE roles IS 'System and custom roles with associated permissions';
COMMENT ON TABLE permissions IS 'All available permissions in the system';
COMMENT ON TABLE workspace_user_permissions IS 'Custom permissions granted to users in specific workspaces';
COMMENT ON TABLE social_account_permissions IS 'Granular permissions for social media account access';

COMMENT ON COLUMN roles.is_system_role IS 'Whether this is a built-in system role (cannot be deleted)';
COMMENT ON COLUMN roles.permissions IS 'JSON array of permission names associated with this role';
COMMENT ON COLUMN workspace_user_permissions.permissions IS 'JSON array of additional permissions granted to user';
COMMENT ON COLUMN social_account_permissions.permissions IS 'Array of permissions for specific social media account';

-- Support tables for draft interactions
CREATE TABLE IF NOT EXISTS draft_comments (
    id UUID PRIMARY KEY,
    draft_id UUID NOT NULL REFERENCES draft_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS draft_reactions (
    id UUID PRIMARY KEY,
    draft_id UUID NOT NULL REFERENCES draft_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
