-- Run in Supabase SQL Editor once: stable semantic category + optional JSON metadata per expenditure row.
-- See README / DEPLOY.md.

alter table public.budget_expenditures
  add column if not exists category text not null default 'other';

alter table public.budget_expenditures
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.budget_expenditures.category is
  'Stable type: housing_rent, housing_mortgage, utility, council_tax, insurance, subscription, phone, other';
comment on column public.budget_expenditures.metadata is 'Optional per-row data (e.g. mortgage terms) for category-specific UI';
