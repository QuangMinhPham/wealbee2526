create table if not exists email_events (
  id            bigserial primary key,
  email_id      text not null,
  recipient     text,
  subject       text,
  event_type    text not null,  -- delivered, opened, clicked, bounced, complained
  click_url     text,
  occurred_at   timestamptz not null default now(),
  raw           jsonb
);

create index on email_events (occurred_at desc);
create index on email_events (event_type);
create index on email_events (recipient);

alter table email_events enable row level security;

-- Service role có full access (Edge Function dùng service key)
create policy "service_role_all" on email_events
  for all to service_role using (true) with check (true);
