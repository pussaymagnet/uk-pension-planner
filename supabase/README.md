# Supabase manual SQL (Budget vs Pension)

This project uses **hand-run scripts** in the Supabase Dashboard **SQL Editor** (not Supabase CLI migrations). Scripts are grouped by app area:

| Folder | Use |
|--------|-----|
| [`budget/`](./budget/) | Household Budget tab (tables/columns for expenditures, debts, savings, credit cards, settings, savings goals) |
| [`pension/`](./pension/) | Pension inputs (`pension_inputs` columns and related) |

## Apply tracking: `sql-manifest.json`

[`sql-manifest.json`](./sql-manifest.json) lists every script with:

- **`path`** — relative to this `supabase/` folder (e.g. `budget/budget_debts.sql`)
- **`status`** — `pending` (not yet run on your Supabase project, or not verified) or `applied` (you have run it in the SQL Editor)
- **`note`** — optional short description

After you run a script successfully on your project, change its `status` to `"applied"` (and optionally add `"appliedAt": "2026-02-12"` if you want a dated audit trail). **Supabase does not know** what you ran manually; this file is the project’s checklist.

**After pulling `main`:** open `sql-manifest.json`, run any scripts still `pending` that your app version needs, then mark them `applied`.

## Create a new script (correct folder + manifest)

From the repo root:

```bash
npm run sql:new -- --tab budget --name my_feature
npm run sql:new -- --tab pension --name extra_column
```

This creates:

- **Budget:** `supabase/budget/budget_<slug>.sql`
- **Pension:** `supabase/pension/pension_inputs_<slug>.sql`

…with a short header comment and appends a `pending` entry to `sql-manifest.json`. Edit the `.sql` file with your DDL, run it in the SQL Editor when ready, then set `applied` in the manifest.

## Verify manifest matches files

```bash
npm run sql:verify
```

Fails if a `.sql` file exists under `budget/` or `pension/` but is missing from `sql-manifest.json`, or if the manifest references a missing file.

## More detail

See **[DEPLOY.md](../DEPLOY.md)** for feature-by-feature notes and links to each script.
