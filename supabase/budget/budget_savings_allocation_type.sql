-- Adds savings allocation for Projection routing (cash vs stocks growth).
-- Run in Supabase SQL Editor if `budget_savings` already exists.

alter table public.budget_savings
  add column if not exists allocation_type text not null default 'cash';

comment on column public.budget_savings.allocation_type is
  'cash | stocks — which balance in Projection receives this monthly amount';
