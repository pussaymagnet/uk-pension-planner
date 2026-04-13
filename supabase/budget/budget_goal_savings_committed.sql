-- Run in Supabase SQL Editor once if `budget_goal_savings` already exists without commit columns.
-- New installs get these columns from budget_goal_savings.sql.

alter table public.budget_goal_savings
  add column if not exists committed boolean not null default false;

alter table public.budget_goal_savings
  add column if not exists committed_monthly_contribution numeric not null default 0;
