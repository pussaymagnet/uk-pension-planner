export function BudgetSyncErrorBanner({ syncError, onDismiss }) {
  if (!syncError) return null;
  return (
    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
      <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <div className="flex-1">
        <p className="text-xs font-semibold text-red-700 mb-0.5">Cloud sync failed</p>
        <p className="text-xs text-red-600">{syncError}</p>
        <p className="text-xs text-red-500 mt-1">
          Your data is saved locally on this device. Sign out and back in after fixing the issue to restore sync.
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-red-400 hover:text-red-600 transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
