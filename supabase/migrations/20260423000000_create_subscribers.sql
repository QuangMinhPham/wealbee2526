-- Bảng subscribers: lưu email + danh mục cổ phiếu đăng ký nhận tin
create table if not exists public.subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  holdings    jsonb not null default '[]',  -- [{symbol, quantity}]
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index để query theo email nhanh
create index if not exists subscribers_email_idx on public.subscribers (email);

-- Tự động cập nhật updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger subscribers_updated_at
  before update on public.subscribers
  for each row execute function public.set_updated_at();

-- RLS: service_role có full access, anon chỉ insert (đăng ký)
alter table public.subscribers enable row level security;

create policy "service_role full access"
  on public.subscribers
  for all
  to service_role
  using (true)
  with check (true);

create policy "anon can subscribe"
  on public.subscribers
  for insert
  to anon
  with check (true);

-- Cột labeled_by trong market_news (nếu chưa có)
alter table public.market_news
  add column if not exists labeled_by  text,
  add column if not exists labeled_at  timestamptz;
