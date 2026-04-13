-- Run in Supabase SQL Editor once: goal-saving plans (advisory; not part of monthly outgoings).
-- See README / DEPLOY.md.

create table if not exists public.budget_goal_savings (
  id                         text        primary key,
  user_id                    uuid        not null references auth.users (id) on delete cascade,
  name                       text        not null default '',
  target_amount              numeric     not null check (target_amount > 0),
  current_saved_amount       numeric     not null default 0 check (current_saved_amount >= 0),
  chosen_monthly_contribution numeric    not null default 0 check (chosen_monthly_contribution >= 0),
  committed                  boolean     not null default false,
  committed_monthly_contribution numeric not null default 0 check (committed_monthly_contribution >= 0),
  sort_order                 integer     not null default 0,
  created_at                 timestamptz default now()
);

create index if not exists budget_goal_savings_user_id_idx
  on public.budget_goal_savings (user_id);

alter table public.budget_goal_savings enable row level security;

create policy "Users can select own goal savings"
  on public.budget_goal_savings for select
  using (auth.uid() = user_id);

create policy "Users can insert own goal savings"
  on public.budget_goal_savings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own goal savings"
  on public.budget_goal_savings for update
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own goal savings"
  on public.budget_goal_savings for delete
  using (auth.uid() = user_id);
