# Tab: Net Worth

**Role:** Capture **assets** and **liabilities** (money fields), show totals/insights, import/export JSON, and persist (device + cloud when signed in). Feeds **Projection** snapshot fields.

## Architecture

- **State:** Owned in `App.jsx`: `netWorthInputs` (assets + liabilities object), `netWorthLastUpdatedAtMs`, `netWorthImportError`, flags for remote load/upsert failures, `netWorthLoadedForUserId`.
- **Initial load:** `netWorthLocalPersistenceAdapter.load()` for first paint; effects swap to Supabase when `user` present (`fetchNetWorthBundleForUser`) or back to local when signed out.
- **Derived:** `computeNetWorthSummary` / `computeNetWorthInsights` — mortgage liability is **only** from the Budget mirror (`derivedMortgageBalance` in `App.jsx`); manual liabilities are loans + credit cards. Insights also use `essentialMonthlyCosts` from the budget mirror.
- **UI:** `NetWorthTab.jsx`, `NetWorthAssetCurrencyField.jsx` for inputs.
- **Money helpers:** `utils/netWorthMoney.js`, `safeMoney` in summary.

## Persistence

- Canonical `liabilities` in saved JSON are **`loans` + `creditCards` only**; legacy `mortgageBalance` in old files is read once for property-equity migration then dropped (`normalizeNetWorthInputs` in `netWorthStorage.js`).
- Device: `netWorthPersistenceAdapter` (mirrors bundle on change).
- Cloud: `utils/netWorthSupabase.js` — debounced upsert after successful load for current user.
- Status label: `deriveNetWorthStorageStatus` + `netWorthPersistenceStatus.js` (UI string via label map).

## Key files

| File | Responsibility |
|------|----------------|
| `netWorthStorage.js` | Defaults, normalization, import parse |
| `netWorthSummary.js` | Totals and insight logic |
| `netWorthSupabase.js` | Remote fetch/upsert |

## Schema

- SQL under `supabase/net_worth/`; manifest in `supabase/sql-manifest.json`.
