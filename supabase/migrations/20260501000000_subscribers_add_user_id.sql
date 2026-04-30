-- Liên kết subscribers với Supabase Auth user
-- Người dùng subscribe qua /start (chưa có account) sẽ có user_id = NULL
-- Khi họ đăng ký tài khoản, user_id được cập nhật để liên kết

ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index để lookup nhanh theo user_id
CREATE INDEX IF NOT EXISTS subscribers_user_id_idx ON public.subscribers (user_id);

-- RLS: user đã đăng nhập có thể đọc/sửa row của chính mình (theo email hoặc user_id)
CREATE POLICY "user can read own subscription"
  ON public.subscribers FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "user can update own subscription"
  ON public.subscribers FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
