-- ============================================
-- 2509班 班级网站 — Auth 权限系统迁移
-- 在 Supabase SQL Editor 中执行此脚本
-- ============================================

-- 1. 用户资料表（关联 auth.users）
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 新用户注册时自动创建 profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), 'student');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 3. 给现有帖子添加 author_id 字段（保留旧数据兼容）
ALTER TABLE posts ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id);
ALTER TABLE replies ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id);

-- 4. 删除旧的 RLS 策略（公开读写）
DROP POLICY IF EXISTS "允许任何人读取帖子" ON posts;
DROP POLICY IF EXISTS "允许任何人发布帖子" ON posts;
DROP POLICY IF EXISTS "允许任何人读取回复" ON replies;
DROP POLICY IF EXISTS "允许任何人发布回复" ON replies;

-- 5. 新的 RLS 策略

-- 帖子：任何人可读
CREATE POLICY "任何人可读帖子" ON posts FOR SELECT USING (true);

-- 帖子：认证用户可发布
CREATE POLICY "认证用户可发布帖子" ON posts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 帖子：作者可编辑自己的帖子
CREATE POLICY "作者可编辑帖子" ON posts FOR UPDATE
  USING (auth.uid() = author_id);

-- 帖子：admin 可删除任何帖子
CREATE POLICY "管理员可删除帖子" ON posts FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 回复：任何人可读
CREATE POLICY "任何人可读回复" ON replies FOR SELECT USING (true);

-- 回复：认证用户可发布
CREATE POLICY "认证用户可发布回复" ON replies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 回复：admin 可删除
CREATE POLICY "管理员可删除回复" ON replies FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 6. profiles 表权限
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "任何人可读资料" ON profiles FOR SELECT USING (true);
CREATE POLICY "用户可更新自己资料" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 7. 实时订阅（重新启用，因为之前可能被重置）
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE replies;
