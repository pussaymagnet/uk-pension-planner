/**
 * InfoFooter — displays the current tax year and key rules being applied.
 * Data comes from TAX_RULES via props so it updates automatically each year.
 */
import { TAX_RULES } from '../data/taxRules';
import { formatCurrency } from '../utils/calculations';

export default function InfoFooter() {
  const { currentYear, incomeTax, pension, dividends, savings } = TAX_RULES;
  const pa = incomeTax.personalAllowance;
  const aa = pension.annualAllowance.standard;

  const rules = [
    { label: 'Tax year', value: currentYear },
    { label: 'Personal allowance', value: formatCurrency(pa) },
    { label: 'Basic rate (20%)', value: `${formatCurrency(pa + 1)} – ${formatCurrency(incomeTax.bands[1].max)}` },
    { label: 'Higher rate (40%)', value: `${formatCurrency(incomeTax.bands[2].min)} – ${formatCurrency(incomeTax.bands[2].max)}` },
    { label: 'Additional rate (45%)', value: `Above ${formatCurrency(incomeTax.bands[3].min - 1)}` },
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
        Tax rules apply to England, Wales &amp; Northern Ireland. Scotland has separate income tax bands.
        Always consult a qualified financial adviser before making pension decisions.
      </p>
    </footer>
  );
}
