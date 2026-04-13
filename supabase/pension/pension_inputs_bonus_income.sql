-- Run once in Supabase SQL Editor if you use cloud sync for pension inputs.
-- Annual gross bonus employment income (tax/NI/student loan; excluded from pension % bases).

alter table public.pension_inputs
  add column if not exists bonus_income numeric;

comment on column public.pension_inputs.bonus_income is
  'Annual gross bonus; nullable. Employment gross = gross_salary + bonus_income.';
