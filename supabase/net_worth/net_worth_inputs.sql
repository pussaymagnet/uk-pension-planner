-- Run in Supabase SQL Editor once: signed-in Net Worth sync (canonical inputs + edit timestamp).
-- Local `localStorage` remains the offline mirror; see DEPLOY.md / supabase/README.md.

create table if not exists public.net_worth_inputs (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  inputs                jsonb not null default '{}',
  last_updated_at_ms    bigint,
  updated_at            timestamptz not null default now()
);

comment on table public.net_worth_inputs is 'Per-user net worth inputs; assets/liabilities JSON matches app canonical shape; last_updated_at_ms is UI metadata.';
comment on column public.net_worth_inputs.inputs is 'Canonical { assets, liabilities }; liabilities are loans + credit cards only (mortgage from Budget). Normalized on read in the app.';
comment on column public.net_worth_inputs.last_updated_at_ms is 'Client-reported last edit time (epoch ms); optional.';

alter table public.net_worth_inputs enable row level security;

create policy "Users can select own net worth inputs"
  on public.net_worth_inputs for select
  using (auth.uid() = user_id);

create policy "Users can insert own net worth inputs"
  on public.net_worth_inputs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own net worth inputs"
  on public.net_worth_inputs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own net worth inputs"
  on public.net_worth_inputs for delete
  using (auth.uid() = user_id);
