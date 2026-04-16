import { formatCurrency } from '../utils/calculations';
import { getLabel } from '../utils/fieldLabels';

/**
 * Native `title` text for asset cells: cumulative contributions + growth only (matches engine row).
 *
 * @param {import('../utils/projectionSummary.js').AssetClassAttribution | undefined} a
 */
export function formatAssetAttributionTitle(a) {
  if (!a) return '';
  return [
    `${getLabel('projection_attr_hover_contrib')}: ${formatCurrency(a.contributions)}`,
    `${getLabel('projection_attr_hover_growth')}: ${formatCurrency(a.growth)}`,
  ].join('\n');
}

/**
 * Rich hover tooltip for projected asset values — cumulative contributions + growth from engine `byAsset` only.
 *
 * @param {object} props
 * @param {import('../utils/projectionSummary.js').ByAssetAttribution | undefined} props.byAsset
 * @param {'pension' | 'stocks' | 'cash' | 'property'} props.assetKey
 * @param {unknown} props.children — visible value (unchanged)
 */
export function ProjectionAssetAttributionHover({ byAsset, assetKey, children }) {
  const a = byAsset?.[assetKey];
  if (!a) {
    return children;
  }
  const title = formatAssetAttributionTitle(a);
  return (
    <span
      className="group relative inline-block cursor-help rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
      tabIndex={0}
      title={title}
    >
      <span className="border-b border-dotted border-slate-400">{children}</span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 bottom-full z-50 mb-2 hidden w-max min-w-[200px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-[11px] leading-snug text-slate-800 shadow-lg group-hover:block group-focus-within:block whitespace-normal"
      >
        <dl className="space-y-1">
          <div className="flex justify-between gap-4 tabular-nums">
            <dt className="text-slate-500">{getLabel('projection_attr_hover_contrib')}</dt>
            <dd>{formatCurrency(a.contributions)}</dd>
          </div>
          <div className="flex justify-between gap-4 tabular-nums">
            <dt className="text-slate-500">{getLabel('projection_attr_hover_growth')}</dt>
            <dd>{formatCurrency(a.growth)}</dd>
          </div>
        </dl>
      </span>
    </span>
  );
}
