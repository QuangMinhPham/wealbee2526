-- ── Task 6: Sector data + Macro → Sector → Stock scoring ─────────────────────
-- Run in Supabase SQL Editor

-- 1. Add sector columns to stocks table
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS sector_name TEXT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS sector_slug TEXT;

CREATE INDEX IF NOT EXISTS idx_stocks_sector_slug ON stocks(sector_slug);

-- 2. Add sector_impacts to market_news (for Vĩ mô / Thị trường articles)
ALTER TABLE market_news ADD COLUMN IF NOT EXISTS sector_impacts JSONB;

-- GIN index for fast containment queries: sector_impacts @> '[{"sector":"ngan_hang"}]'
CREATE INDEX IF NOT EXISTS idx_market_news_sector_impacts
  ON market_news USING gin(sector_impacts);
