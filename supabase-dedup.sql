-- 删除重复照片（保留最早的一条）
DELETE FROM moments
WHERE id NOT IN (
  SELECT MIN(id) FROM moments GROUP BY image_url
)
AND image_url IS NOT NULL;
