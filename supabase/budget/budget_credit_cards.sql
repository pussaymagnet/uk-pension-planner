-- Run in Supabase SQL Editor once: credit card balances + minimum monthly payments (Budget tab).
-- See README / DEPLOY.md.

create table if not exists public.budget_credit_cards (
  id                       text        primary key,
  user_id                  uuid        not null references auth.users (id) on delete cascade,
  name                     text        not null default '',
  total_balance            numeric     not null check (total_balance >= 0),
  minimum_monthly_payment  numeric     not null check (minimum_monthly_payment >= 0),
  apr_pct                  numeric,
  notes                    text,
  sort_order               integer     not null default 0,
  created_at               timestamptz default now()
);

create index if not exists budget_credit_cards_user_id_idx
  on public.budget_credit_cards (user_id);

alter table public.budget_credit_cards enable row level security;

create policy "Users can select own credit cards"
  on public.budget_credit_cards for select
  using (auth.uid() = user_id);

create policy "Users can insert own credit cards"
  on public.budget_credit_cards for insert
  with check (auth.uid() = user_id);

create policy "Users can update own credit cards"
  on public.budget_credit_cards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own credit cards"
  on public.budget_credit_cards for delete
  using (auth.uid() = user_id);
