# UK Pension Planner

React + Vite app for pension contributions, take-home estimates, and household budget. Optional **Supabase** sign-in syncs pension inputs and budget data to the cloud. SQL scripts live under [`supabase/budget/`](./supabase/budget/) (Household Budget) and [`supabase/pension/`](./supabase/pension/) (pension inputs). Run pending scripts in the Supabase SQL editor (see [supabase/README.md](./supabase/README.md) and [DEPLOY.md](./DEPLOY.md)).

## Local development

```bash
npm install
cp .env.local.example .env.local   # then add your Supabase URL + anon key
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Deploy for internet access

See **[DEPLOY.md](./DEPLOY.md)** — host on **Vercel** (or Netlify) from GitHub; users get a public URL while you keep coding locally.
