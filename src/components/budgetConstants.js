/** Expenditure section: Fixed Costs vs Nice to Have */
export const SECTION_FIXED = 'fixed';
export const SECTION_NICE = 'niceToHave';

/** Default monthly budget lines — seeded when the user has no saved expenditures */
export function createDefaultExpenditures() {
  return [
    { id: 'seed-fixed-rent', name: 'Mortgage or rent', amount: 0, partner1Pct: 100, section: SECTION_FIXED },
    { id: 'seed-fixed-electricity', name: 'Electricity', amount: 0, partner1Pct: 100, section: SECTION_FIXED },
    { id: 'seed-fixed-council', name: 'Council tax', amount: 0, partner1Pct: 100, section: SECTION_FIXED },
    { id: 'seed-fixed-car-ins', name: 'Car insurance', amount: 0, partner1Pct: 100, section: SECTION_FIXED },
    { id: 'seed-fixed-pet-ins', name: 'Pet insurance', amount: 0, partner1Pct: 100, section: SECTION_FIXED },
    { id: 'seed-nice-phone', name: 'Phone bill', amount: 0, partner1Pct: 100, section: SECTION_NICE },
    { id: 'seed-nice-subs', name: 'Subscription', amount: 0, partner1Pct: 100, section: SECTION_NICE },
  ];
}

const r2 = (n) => Math.round((n ?? 0) * 100) / 100;

/** Normalize a row from API or localStorage (legacy rows without section → fixed) */
export function normalizeExpenditureRow(r) {
  const section = r.section === SECTION_NICE ? SECTION_NICE : SECTION_FIXED;
  return {
    id: r.id,
    name: r.name ?? '',
    amount: r2(Number(r.amount) || 0),
    partner1Pct: r2(Number(r.partner1_pct ?? r.partner1Pct) ?? 100),
    section,
  };
}
