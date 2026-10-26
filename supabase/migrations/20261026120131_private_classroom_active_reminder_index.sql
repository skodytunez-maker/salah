create index if not exists classroom_active_reminder_due on salah_classroom_private.lessons(reminder_at) where state in('planned','live');
