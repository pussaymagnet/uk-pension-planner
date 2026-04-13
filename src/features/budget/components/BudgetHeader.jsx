import {
  BUDGET_PAGE_SOURCE_NOTE,
  BUDGET_PAGE_SUBTITLE,
  BUDGET_PAGE_TITLE,
} from '../constants/copy';

export function BudgetHeader({ syncing, user }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-800 sm:text-[1.65rem]">
          {BUDGET_PAGE_TITLE}
        </h2>
        <p className="mt-1 max-w-xl text-[15px] leading-relaxed text-slate-600">
          {BUDGET_PAGE_SUBTITLE}
        </p>
        <p className="mt-1 text-xs text-slate-500">{BUDGET_PAGE_SOURCE_NOTE}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:pt-1">
        {syncing && (
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Loading…
          </span>
        )}
        {user && !syncing && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <svg className="h-3.5 w-3.5 text-emerald-600/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Saved to your account
          </span>
        )}
      </div>
    </div>
  );
}
