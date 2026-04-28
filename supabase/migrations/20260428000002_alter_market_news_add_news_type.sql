-- Thêm cột phân loại tin tức và danh sách mã bị ảnh hưởng
ALTER TABLE market_news
  ADD COLUMN IF NOT EXISTS news_type       TEXT,
  ADD COLUMN IF NOT EXISTS affected_symbols TEXT[];

COMMENT ON COLUMN market_news.news_type IS
  'Loại tin: vi_mo | vi_mo_dn | hoat_dong_kd | phap_ly | thi_truong | du_bao';
COMMENT ON COLUMN market_news.affected_symbols IS
  'Mảng mã cổ phiếu bị ảnh hưởng bởi tin (ví mô/thị trường có thể ảnh hưởng nhiều mã)';
