# App architecture documentation

This folder is the **hand-off surface for humans and other AIs**: what the app does, how tabs connect, where state lives, and what is persisted where.

| Document | Purpose |
|----------|---------|
| [OVERALL_APP_FLOW.md](./OVERALL_APP_FLOW.md) | Single entry: shell, tabs, cross-tab data, persistence map, current maturity |
| [tabs/pension.md](./tabs/pension.md) | Pension tab: calculations, UI, storage |
| [tabs/budget.md](./tabs/budget.md) | Budget tab: provider, mirror, mortgage, Supabase |
| [tabs/net-worth.md](./tabs/net-worth.md) | Net Worth tab: assets/liabilities, cloud sync |
| [tabs/projection.md](./tabs/projection.md) | Projection tab: inputs, snapshot from other tabs, series math |
| [../logic-data-flow.md](../logic-data-flow.md) | **Deep logic reference** (formulas, field-by-field); keep for detail |

## Keeping docs in sync

- **After you accept changes** that touch routing, persistence, cross-tab mirrors, or tab behaviour: update the relevant file under `docs/architecture/` (and bump the “Last updated” line in `OVERALL_APP_FLOW.md`).
- A **Cursor rule** (`.cursor/rules/architecture-docs.mdc`) reminds the assistant to update these docs when editing matching code paths.

There is no automatic regeneration of prose from code; the value is intentional summaries. If you add CI later, you could add a check that `OVERALL_APP_FLOW.md` was touched in PRs that change `src/App.jsx` or `features/budget/`.
