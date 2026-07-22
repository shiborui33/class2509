-- 补漏：添加班主任和之前漏掉的4位同学到白名单
INSERT INTO whitelist (name) VALUES
('李智英'),('于优然'),('张洺浩'),('张谨萱'),('赵世博')
ON CONFLICT (name) DO NOTHING;
