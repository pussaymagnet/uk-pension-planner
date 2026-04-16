-- Run in Supabase SQL Editor once: signed-in Projection tab sync (assumption inputs as JSON).
-- Local `localStorage` (STORAGE_KEY_PROJECTION) remains the offline mirror; app normalizes on read.
-- Baseline figures (pension contributions, budget savings splits) still come from Pension + Budget mirrors.

create table if not exists public.projection_inputs (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  inputs                jsonb not null default '{}',
  last_updated_at_ms    bigint,
  updated_at            timestamptz not null default now()
);

comment on table public.projection_inputs is 'Per-user Projection tab assumption inputs; JSON matches normalizeProjectionInputs in the app.';
comment on column public.projection_inputs.inputs is
  'Canonical fields: projectionYears, pensionGrowthAnnualPct, investmentGrowthAnnualPct, cashGrowthAnnualPct, contributionEscalationAnnualPct, inflationAnnualPct.';
comment on column public.projection_inputs.last_updated_at_ms is 'Client-reported last edit time (epoch ms); optional.';

alter table public.projection_inputs enable row level security;

create policy "Users can select own projection inputs"
  on public.projection_inputs for select
  using (auth.uid() = user_id);

create policy "Users can insert own projection inputs"
  on public.projection_inputs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projection inputs"
  on public.projection_inputs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own projection inputs"
  on public.projection_inputs for delete
  using (auth.uid() = user_id);
