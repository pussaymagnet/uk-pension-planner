import { useEffect, useState } from 'react';
import { parsePoundsInput } from '../utils/netWorthMoney';

/**
 * @param {number} n
 * @returns {string} Empty when n ≤ 0; otherwise en-GB grouping (commas), optional decimals.
 */
function formatBlurDisplay(n) {
  if (!Number.isFinite(n) || n <= 0) return '';
  return n.toLocaleString('en-GB', {
    maximumFractionDigits: 10,
    useGrouping: true,
  });
}

/**
 * Single £ amount field for net worth rows — local draft while typing; commits a number on blur only.
 */
export default function NetWorthAssetCurrencyField({ label, value, onChange }) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() => formatBlurDisplay(value));

  useEffect(() => {
    if (!focused) {
      setDraft(formatBlurDisplay(value));
    }
  }, [value, focused]);

  const handleFocus = () => {
    setFocused(true);
    setDraft((d) => d.replace(/,/g, ''));
  };

  const handleBlur = () => {
    setFocused(false);
    const normalized = parsePoundsInput(draft);
    onChange(normalized);
    setDraft(formatBlurDisplay(normalized));
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-2 mb-0.5">
        <label className="text-sm font-semibold text-slate-800 flex-1 min-w-0">{label}</label>
      </div>
      <div className="relative flex items-center">
        <span className="absolute left-3 text-slate-500 text-sm font-medium select-none">£</span>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="
            w-full rounded-lg border border-slate-300 bg-white py-2 min-h-[2.5rem] text-base text-slate-900
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            transition-colors
            pl-7 pr-3
          "
          placeholder="0"
        />
      </div>
    </div>
  );
}
