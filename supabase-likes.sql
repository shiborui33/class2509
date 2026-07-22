-- 点滴点赞功能
CREATE TABLE IF NOT EXISTS moment_likes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  moment_id BIGINT NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(moment_id, user_id)
);

ALTER TABLE moment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "任何人可读点赞" ON moment_likes FOR SELECT USING (true);
CREATE POLICY "认证用户可点赞" ON moment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "用户可取消点赞" ON moment_likes FOR DELETE USING (auth.uid() = user_id);

-- 删除含副本的图片
DELETE FROM moments WHERE content LIKE '%副本%';
