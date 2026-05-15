-- 003_admin_panel_fixes.sql
-- Adds columns required by the AdminPanel feature set:
--   • hub_enrollments.notes     — inline CRM notes on each enrollment card / Kanban
--   • student_support.priority  — Urgente / Alta / Média / Baixa pill on tickets
--   • hub_notices.{segment, module_filter, status_filter, scheduled_at, read_by}
--                               — segmentation, scheduling, and read-receipts metadata
--   • users.last_login_at       — populated on successful login, surfaced in student detail

-- Enrollments: notes
ALTER TABLE hub_enrollments
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- Support tickets: priority
ALTER TABLE student_support
  ADD COLUMN IF NOT EXISTS priority text;

-- Notices: segmentation + scheduling + read receipts
ALTER TABLE hub_notices
  ADD COLUMN IF NOT EXISTS segment text DEFAULT 'todos',
  ADD COLUMN IF NOT EXISTS module_filter text,
  ADD COLUMN IF NOT EXISTS status_filter text,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamp,
  ADD COLUMN IF NOT EXISTS read_by jsonb DEFAULT '[]'::jsonb;

-- Users: last login timestamp
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login_at timestamp;
