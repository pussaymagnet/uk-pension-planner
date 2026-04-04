# Deploy UK Pension Planner to the internet

You keep editing code **locally** (`npm run dev`). Users open a **public URL** (e.g. `https://your-app.vercel.app`) that always serves the latest version **after you push to Git and the host rebuilds** (or trigger redeploy manually).

---

## 1. Put the project on GitHub (once)

1. Create a new repository on [github.com](https://github.com/new) (no need to add a README if the folder already has files).
2. In your project folder, run (replace `YOUR_USER` and `YOUR_REPO`):

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
   git push -u origin main
   ```

**Important:** `.env.local` is ignored by git (see `.gitignore`). Your Supabase keys stay on your machine only — you will add them again in the host’s dashboard in step 3.

---

## 2. Deploy on Vercel (free tier)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. **Add New Project** → **Import** your repository.
3. Vercel should detect **Vite** automatically. Build command: `npm run build`, output: `dist`.
4. **Environment Variables** — add exactly these (same values as in your local `.env.local`):

   | Name | Value |
   |------|--------|
   | `VITE_SUPABASE_URL` | `https://YOUR-PROJECT.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | Your anon public key from Supabase |

5. Click **Deploy**. After ~1 minute you get a URL like `https://your-app.vercel.app`.

Every **git push** to `main` triggers a new deployment. Local `npm run dev` is unchanged.

---

## 3. Allow your live URL in Supabase (required for sign-in)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **Authentication** → **URL Configuration**.
3. Set **Site URL** to your production URL, e.g. `https://your-app.vercel.app`.
4. Under **Redirect URLs**, add the same URL (and `http://localhost:5173` if you want email links to work locally too).

Save. Sign up / sign in on the live site should work after this.

---

## Supabase: budget debts table (Household Budget)

If you use **sign-in** and the **Household Budget** tab, run the SQL in [`supabase/budget_debts.sql`](./supabase/budget_debts.sql) once in the Supabase **SQL Editor** so loan/debt rows sync to the cloud. Local-only users can skip this.

## Supabase: expenditure sections (Fixed Costs / Nice to Have)

Run [`supabase/budget_expenditures_section.sql`](./supabase/budget_expenditures_section.sql) once in the **SQL Editor** so the `section` column exists on `budget_expenditures`. Without it, signed-in users may get errors when saving expenditures after upgrading the app.

## Supabase: monthly savings

Run [`supabase/budget_savings.sql`](./supabase/budget_savings.sql) once in the **SQL Editor** to create the `budget_savings` table used by the Monthly Savings feature in the Budget tab. Local-only users can skip this.

## Supabase: pension income tax region (England & Wales vs Scotland)

Run [`supabase/pension_inputs_tax_region.sql`](./supabase/pension_inputs_tax_region.sql) once in the **SQL Editor** to add the `tax_region` column on `pension_inputs`. Without it, saving the England/Scotland toggle while signed in may fail. The app still works offline with `localStorage`.

---

## Alternative: Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import from Git**.
2. Build: `npm run build`, publish directory: `dist` (already in `netlify.toml`).
3. Add the same two environment variables under **Site settings → Environment variables**.
4. Update Supabase **Site URL** and **Redirect URLs** to your Netlify URL.

---

## Quick checklist

- [ ] Code on GitHub (without committing `.env.local`)
- [ ] Vercel (or Netlify) project with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] Supabase Auth **Site URL** + **Redirect URLs** include your live domain

After that, anyone with the link can use the app; data still lives in your Supabase project per user account.
