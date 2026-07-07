-- 创建公告表
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'important', 'update')),
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at);

-- RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- 管理员可以读写所有公告
CREATE POLICY "Allow admin read announcements"
  ON announcements FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Allow admin insert announcements"
  ON announcements FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Allow admin update announcements"
  ON announcements FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Allow admin delete announcements"
  ON announcements FOR DELETE
  USING (public.is_admin());
