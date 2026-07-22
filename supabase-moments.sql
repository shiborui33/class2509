-- 同学点滴：班级生活记录 + 照片墙
CREATE TABLE IF NOT EXISTS moments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  author TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE moments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "任何人可读点滴" ON moments;
CREATE POLICY "任何人可读点滴" ON moments FOR SELECT USING (true);

DROP POLICY IF EXISTS "认证用户可发点滴" ON moments;
CREATE POLICY "认证用户可发点滴" ON moments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "管理员可删点滴" ON moments;
CREATE POLICY "管理员可删点滴" ON moments FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

ALTER PUBLICATION supabase_realtime ADD TABLE moments;
