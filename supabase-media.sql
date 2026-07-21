-- 论坛媒体功能：添加 media_url 和 media_type 列
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_type TEXT;
