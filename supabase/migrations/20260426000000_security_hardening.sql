-- Security hardening: RLS enforcement + AI rate limiting + subscription protection

-- ============================================================
-- 1. ROW LEVEL SECURITY — đảm bảo user chỉ đọc/ghi data của mình
-- ============================================================

ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_income_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Portfolios
DROP POLICY IF EXISTS "user_owns_portfolio" ON portfolios;
CREATE POLICY "user_owns_portfolio"
  ON portfolios FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Stocks assets
DROP POLICY IF EXISTS "user_owns_stocks" ON stocks_assets;
CREATE POLICY "user_owns_stocks"
  ON stocks_assets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Gold assets
DROP POLICY IF EXISTS "user_owns_gold" ON gold_assets;
CREATE POLICY "user_owns_gold"
  ON gold_assets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Crypto assets
DROP POLICY IF EXISTS "user_owns_crypto" ON crypto_assets;
CREATE POLICY "user_owns_crypto"
  ON crypto_assets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fixed income
DROP POLICY IF EXISTS "user_owns_fixed_income" ON fixed_income_assets;
CREATE POLICY "user_owns_fixed_income"
  ON fixed_income_assets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Custom assets
DROP POLICY IF EXISTS "user_owns_custom" ON custom_assets;
CREATE POLICY "user_owns_custom"
  ON custom_assets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Transactions
DROP POLICY IF EXISTS "user_owns_transactions" ON transactions;
CREATE POLICY "user_owns_transactions"
  ON transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 2. AI RATE LIMITING — enforce ở DB layer (50 msg/ngày/user)
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_rate_limits (
  user_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date     DATE    NOT NULL DEFAULT CURRENT_DATE,
  count    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

ALTER TABLE ai_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_owns_rate_limit" ON ai_rate_limits;
CREATE POLICY "user_owns_rate_limit"
  ON ai_rate_limits FOR ALL
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION check_ai_rate_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO ai_rate_limits (user_id, date, count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET count = ai_rate_limits.count + 1
  RETURNING count INTO v_count;

  RETURN v_count <= 50;
END;
$$;

-- ============================================================
-- 3. SUBSCRIPTION SPAM PROTECTION — giới hạn đăng ký theo email
-- ============================================================

ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_can_subscribe" ON subscribers;
CREATE POLICY "anon_can_subscribe"
  ON subscribers FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full" ON subscribers;
CREATE POLICY "service_role_full"
  ON subscribers FOR ALL
  TO service_role
  USING (true);

-- Ngăn duplicate email ở DB level (đã có constraint, thêm index rõ ràng)
CREATE UNIQUE INDEX IF NOT EXISTS subscribers_email_unique ON subscribers (lower(email));

-- ============================================================
-- 4. KV STORE — chỉ service role được truy cập
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'kv_store_aa51327d'
  ) THEN
    EXECUTE 'ALTER TABLE kv_store_aa51327d ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "service_only" ON kv_store_aa51327d';
    EXECUTE $p$
      CREATE POLICY "service_only"
        ON kv_store_aa51327d FOR ALL
        TO service_role
        USING (true)
    $p$;
  END IF;
END;
$$;
