-- Run in Supabase SQL Editor once: creates the savings table for the Budget tab.
-- See README / DEPLOY.md.

create table if not exists public.budget_savings (
  id          text        primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  name        text        not null default '',
  amount      numeric     not null,
  sort_order  integer     not null default 0,
  created_at  timestamptz default now()
);

create index if not exists budget_savings_user_id_idx
  on public.budget_savings (user_id);

alter table public.budget_savings enable row level security;

create policy "Users can select own savings"
  on public.budget_savings for select
  using (auth.uid() = user_id);

create policy "Users can insert own savings"
  on public.budget_savings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own savings"
  on public.budget_savings for update
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own savings"
  on public.budget_savings for delete
  using (auth.uid() = user_id);
