-- 点滴评论功能
CREATE TABLE IF NOT EXISTS moment_comments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  moment_id BIGINT NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE moment_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "任何人可读评论" ON moment_comments FOR SELECT USING (true);
CREATE POLICY "认证用户可发评论" ON moment_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "管理员可删评论" ON moment_comments FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE INDEX idx_comments_moment ON moment_comments(moment_id);
ALTER PUBLICATION supabase_realtime ADD TABLE moment_comments;
