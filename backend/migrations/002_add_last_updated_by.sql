-- Add last_updated_by field to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_updated_by UUID REFERENCES users(id);

-- Add last_updated_by field to comments table  
ALTER TABLE comments ADD COLUMN IF NOT EXISTS last_updated_by UUID REFERENCES users(id);

-- Update existing tasks to set last_updated_by to the creator
UPDATE tasks SET last_updated_by = created_by WHERE last_updated_by IS NULL;

-- Update existing comments to set last_updated_by to the user_id
UPDATE comments SET last_updated_by = user_id WHERE last_updated_by IS NULL;
