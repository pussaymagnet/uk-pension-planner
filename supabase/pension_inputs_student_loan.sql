-- Run once in Supabase SQL Editor if you use cloud sync for pension inputs.
-- Stores Scottish Student Loan Plan 4 selection: 'plan_4' or null.

alter table public.pension_inputs
  add column if not exists student_loan_plan text;

alter table public.pension_inputs
  drop constraint if exists pension_inputs_student_loan_plan_check;

alter table public.pension_inputs
  add constraint pension_inputs_student_loan_plan_check
  check (student_loan_plan is null or student_loan_plan = 'plan_4');

comment on column public.pension_inputs.student_loan_plan is
  'Scottish Plan 4 student loan: plan_4 or null. Only used when tax_region is scotland.';
