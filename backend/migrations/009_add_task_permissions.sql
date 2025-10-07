-- Migration: Add task permissions to the system
-- This adds the missing task-related permissions that are needed for task management

INSERT INTO permissions (id, name, description, resource, action) VALUES
(gen_random_uuid(), 'task:create', 'Create new tasks', 'task', 'create'),
(gen_random_uuid(), 'task:read', 'View tasks', 'task', 'read'),
(gen_random_uuid(), 'task:update', 'Update tasks', 'task', 'update'),
(gen_random_uuid(), 'task:delete', 'Delete tasks', 'task', 'delete'),
(gen_random_uuid(), 'task:assign', 'Assign tasks to users', 'task', 'assign')
ON CONFLICT (name) DO NOTHING;

-- Grant task permissions to existing roles
-- Workspace Admin: All task permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'workspace_admin' 
  AND p.resource = 'task'
ON CONFLICT DO NOTHING;

-- Content Manager: All task permissions except delete
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'content_manager' 
  AND p.resource = 'task'
  AND p.action != 'delete'
ON CONFLICT DO NOTHING;

-- Contributor: Create, read, update own tasks
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'contributor' 
  AND p.resource = 'task'
  AND p.action IN ('create', 'read', 'update')
ON CONFLICT DO NOTHING;

-- Viewer: Read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'viewer' 
  AND p.resource = 'task'
  AND p.action = 'read'
ON CONFLICT DO NOTHING;
