# UK Pension Planner

React + Vite app for pension contributions, take-home estimates, and household budget. Optional **Supabase** sign-in syncs pension inputs and budget data to the cloud. Run these in the Supabase SQL editor once (see [DEPLOY.md](./DEPLOY.md)): [`supabase/budget_debts.sql`](./supabase/budget_debts.sql) (debts), [`supabase/budget_expenditures_section.sql`](./supabase/budget_expenditures_section.sql) (Fixed Costs / Nice to Have sections on expenditures), [`supabase/budget_savings.sql`](./supabase/budget_savings.sql) (monthly savings), and [`supabase/pension_inputs_tax_region.sql`](./supabase/pension_inputs_tax_region.sql) (England vs Scotland income tax on pension inputs).

## Local development

```bash
npm install
cp .env.local.example .env.local   # then add your Supabase URL + anon key
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Deploy for internet access

See **[DEPLOY.md](./DEPLOY.md)** — host on **Vercel** (or Netlify) from GitHub; users get a public URL while you keep coding locally.
