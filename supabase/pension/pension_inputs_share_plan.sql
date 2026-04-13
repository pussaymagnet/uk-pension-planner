-- Run once in Supabase SQL Editor: share plan fields for cloud sync (matches App.jsx upsert).
-- App: sharePlanContribution (annual £), sharePlanType ('pre_tax' | 'post_tax').

alter table public.pension_inputs
  add column if not exists share_plan_contribution numeric;

alter table public.pension_inputs
  add column if not exists share_plan_type text not null default 'post_tax';

alter table public.pension_inputs
  drop constraint if exists pension_inputs_share_plan_type_check;

alter table public.pension_inputs
  add constraint pension_inputs_share_plan_type_check
  check (share_plan_type in ('pre_tax', 'post_tax'));

comment on column public.pension_inputs.share_plan_contribution is
  'Annual GBP into company share plan; pre_tax reduces adjusted income in the calculator.';

comment on column public.pension_inputs.share_plan_type is
  'pre_tax or post_tax; post_tax has no effect on taxable income in the model.';
