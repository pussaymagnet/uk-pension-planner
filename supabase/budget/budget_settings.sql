-- Run in Supabase SQL Editor once: per-user budget preferences (unexpected spending buffer).
-- See README / DEPLOY.md.

create table if not exists public.budget_settings (
  user_id                    uuid    primary key references auth.users (id) on delete cascade,
  unexpected_spending_buffer numeric not null default 0 check (unexpected_spending_buffer >= 0),
  updated_at                 timestamptz default now()
);

alter table public.budget_settings enable row level security;

create policy "Users can select own budget settings"
  on public.budget_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own budget settings"
  on public.budget_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own budget settings"
  on public.budget_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own budget settings"
  on public.budget_settings for delete
  using (auth.uid() = user_id);
