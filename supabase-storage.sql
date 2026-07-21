-- 论坛文件上传存储
-- 在 Supabase SQL Editor 执行

-- 创建存储桶（需要在 Supabase Dashboard > Storage 手动创建 "forum-files" bucket）
-- 或者通过 SQL:

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('forum-files', 'forum-files', true, 10485760)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 10485760;

-- 存储策略：认证用户可上传
DROP POLICY IF EXISTS "认证用户可上传" ON storage.objects;
CREATE POLICY "认证用户可上传" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'forum-files' AND auth.role() = 'authenticated');

-- 任何人可查看
DROP POLICY IF EXISTS "任何人可查看文件" ON storage.objects;
CREATE POLICY "任何人可查看文件" ON storage.objects
  FOR SELECT USING (bucket_id = 'forum-files');
