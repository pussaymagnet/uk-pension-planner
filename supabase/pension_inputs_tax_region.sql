-- Run once in Supabase SQL Editor: adds income tax region for England & Wales vs Scotland.
-- Values: 'england' (default) | 'scotland'

alter table public.pension_inputs
  add column if not exists tax_region text not null default 'england';

-- Optional: enforce allowed values (skip if you prefer no constraint)
alter table public.pension_inputs
  drop constraint if exists pension_inputs_tax_region_check;

alter table public.pension_inputs
  add constraint pension_inputs_tax_region_check
  check (tax_region in ('england', 'scotland'));

comment on column public.pension_inputs.tax_region is 'Income tax: england (England, Wales, NI) or scotland (Scottish rates). NI is UK-wide either way.';
