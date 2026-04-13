-- Run once in Supabase SQL Editor: annual taxable employer benefits (BIK) for income tax modelling only.

alter table public.pension_inputs
  add column if not exists benefit_in_kind_taxable numeric;

comment on column public.pension_inputs.benefit_in_kind_taxable is
  'Annual cash-equivalent taxable value of employer benefits (e.g. private medical). Used for income tax in the app only — not cash pay, pensions, NI, or student loan.';
