-- Run in Supabase SQL Editor once: adds expenditure section (Fixed Costs vs Nice to Have).
-- See README / DEPLOY.md.

alter table public.budget_expenditures
  add column if not exists section text not null default 'fixed';

comment on column public.budget_expenditures.section is 'fixed | niceToHave';
