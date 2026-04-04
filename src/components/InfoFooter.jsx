/**
 * InfoFooter — displays the current tax year and key rules being applied.
 */
import { TAX_RULES, getIncomeTaxRules } from '../data/taxRules';
import { formatCurrency } from '../utils/calculations';

export default function InfoFooter({ taxRegion = 'england' }) {
  const { currentYear, pension, dividends, savings } = TAX_RULES;
  const incomeTax = getIncomeTaxRules(taxRegion);
  const pa = incomeTax.personalAllowance;
  const aa = pension.annualAllowance.standard;
  const isScotland = taxRegion === 'scotland';

  const bands = incomeTax.bands.filter((b) => b.rate > 0);

  const rules = [
    { label: 'Tax year', value: currentYear },
    { label: 'Income tax region', value: isScotland ? 'Scotland' : 'England, Wales & Northern Ireland' },
    { label: 'Personal allowance', value: formatCurrency(pa) },
    ...bands.map((b) => ({
      label: `${b.name} (${b.rate}%)`,
      value:
        b.max === Infinity
          ? `Above ${formatCurrency(b.min - 1)}`
          : `${formatCurrency(b.min)} – ${formatCurrency(b.max)}`,
    })),
    { label: 'Pension annual allowance', value: formatCurrency(aa) },
    { label: 'Dividend allowance', value: formatCurrency(dividends.allowance) },
    { label: 'Personal savings allowance (basic rate)', value: formatCurrency(savings.personalSavingsAllowance.basicRate) },
    { label: 'Personal savings allowance (higher rate)', value: formatCurrency(savings.personalSavingsAllowance.higherRate) },
  ];

  return (
    <footer className="bg-slate-800 text-slate-300 rounded-2xl p-6 mt-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
        Tax Rules Applied — {currentYear}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1.5">
        {rules.map(({ label, value }) => (
          <div key={label} className="flex justify-between text-xs gap-4">
            <span className="text-slate-400 shrink-0">{label}</span>
            <span className="text-slate-200 font-medium text-right">{value}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-4 leading-relaxed">
        This tool is for illustrative purposes only and does not constitute financial advice.
        {isScotland
          ? ' Scottish income tax bands and rates apply to non-savings, non-dividend income. Class 1 National Insurance is UK-wide.'
          : ' Tax bands shown apply to England, Wales & Northern Ireland. Choose Scotland above for Scottish income tax.'}
        {' '}
        Always consult a qualified financial adviser before making pension decisions.
      </p>
    </footer>
  );
}
