-- 补漏：添加之前漏掉的4位同学到白名单
INSERT INTO whitelist (name) VALUES
('于优然'),('张洺浩'),('张谨萱'),('赵世博')
ON CONFLICT (name) DO NOTHING;
