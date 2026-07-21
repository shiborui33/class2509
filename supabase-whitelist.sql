-- 注册白名单：仅名单上的同学可以注册
CREATE TABLE IF NOT EXISTS whitelist (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

ALTER TABLE whitelist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "任何人可读白名单" ON whitelist;
CREATE POLICY "任何人可读白名单" ON whitelist FOR SELECT USING (true);

-- 插入全班56位同学
INSERT INTO whitelist (name) VALUES
('于欣雨'),('付诗涵'),('任治炎'),('任紫睿'),('刘亦晴'),('刘嘉亮'),('刘梦瑶'),('单童语'),
('史博瑞'),('周絮瑶'),('孙嘉怡'),('孙忠琰'),('孙若涵'),('孟德有'),('崔航源'),('张妙言'),
('张惠芸'),('张纪昕'),('张肖潇'),('李亿冉'),('李佳欣'),('李冰清'),('李可'),('李嘉浩'),
('李宜桐'),('李豪阳'),('李贺康'),('武献艺'),('王淑灿'),('王琳嘉'),('王贺暄'),('石依冉'),
('石恒源'),('程思诺'),('索子娱'),('索学莹'),('胡清涵'),('范琳静'),('赵之萌'),('赵晗琪'),
('邓钰涵'),('邓雯慧'),('邢瑾'),('郑开心'),('郑文博'),('郑蒙蒙'),('郑雨轩'),('郑颖雪'),
('郭子怡'),('陈先锋'),('陈雅轩'),('雷梦涵'),('韩少涵'),('韩聃杨'),('马乐妍'),('魏诗乐')
ON CONFLICT (name) DO NOTHING;
