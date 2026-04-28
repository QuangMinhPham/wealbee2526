ALTER TABLE market_news
  ADD COLUMN IF NOT EXISTS impact_score     NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS impact_reasoning TEXT,
  ADD COLUMN IF NOT EXISTS impact_scored_at TIMESTAMPTZ;

COMMENT ON COLUMN market_news.impact_score     IS 'Điểm tác động -10..10: <-5 rất tiêu cực, -5..-1 tiêu cực, 1..5 tích cực, >5 rất tích cực';
COMMENT ON COLUMN market_news.impact_reasoning IS 'LLM reasoning về mức độ tác động ngắn/dài hạn đến doanh thu/lợi nhuận/kỳ vọng tăng trưởng/rủi ro';
