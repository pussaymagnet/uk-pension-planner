-- Run this in the Supabase SQL Editor (Dashboard → SQL) after deploying the app feature.
-- Creates storage for Household Budget debts synced when users sign in.

create table if not exists public.budget_debts (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  principal numeric not null,
  annual_rate_pct numeric not null,
  term_months integer not null check (term_months > 0),
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

create index if not exists budget_debts_user_id_idx on public.budget_debts (user_id);

alter table public.budget_debts enable row level security;

create policy "Users can select own budget debts"
  on public.budget_debts
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own budget debts"
  on public.budget_debts
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own budget debts"
  on public.budget_debts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own budget debts"
  on public.budget_debts
  for delete
  using (auth.uid() = user_id);
