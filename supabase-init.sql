-- ============================================
-- 2509班 班级网站 — Supabase 数据库初始化
-- 在 Supabase SQL Editor 中执行此脚本
-- ============================================

-- 1. 帖子表
CREATE TABLE IF NOT EXISTS posts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 回复表（外键关联帖子）
CREATE TABLE IF NOT EXISTS replies (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 索引（加速查询）
CREATE INDEX IF NOT EXISTS idx_replies_post_id ON replies(post_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- 4. 开启实时订阅
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE replies;

-- 5. 行级安全策略（RLS）— 公开论坛，允许所有人读写

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;

-- 允许任何人读取帖子
CREATE POLICY "允许任何人读取帖子" ON posts
  FOR SELECT USING (true);

-- 允许任何人发布帖子
CREATE POLICY "允许任何人发布帖子" ON posts
  FOR INSERT WITH CHECK (true);

-- 允许任何人读取回复
CREATE POLICY "允许任何人读取回复" ON replies
  FOR SELECT USING (true);

-- 允许任何人发布回复
CREATE POLICY "允许任何人发布回复" ON replies
  FOR INSERT WITH CHECK (true);

-- 6. 插入初始欢迎帖
INSERT INTO posts (title, author, role, content) VALUES
  ('欢迎来到2509班交流区！', '李智英老师', 'teacher', '同学们好！这是我们班的线上交流空间，学习问题、活动建议、班级事务都可以在这里讨论。希望大家文明发言，互相尊重，共同营造一个温暖的班级社区。'),
  ('数学竞赛获奖喜报！', '张伟', 'student', '热烈祝贺我们班陈思远同学在全国高中数学联赛中获得省级一等奖！这是我们全班的骄傲！'),
  ('班级篮球队周末训练安排', '刘洋', 'student', '这周六下午三点在学校篮球场训练，为下周年级篮球赛做准备。篮球队成员务必参加，也欢迎其他同学来加油！');
