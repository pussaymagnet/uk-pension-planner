/**
 * Amortizing loan monthly repayment (capital + interest), APR compounded monthly.
 *
 * @param {number} principal  Amount borrowed (> 0)
 * @param {number} annualRatePercent  Annual interest rate in % (>= 0)
 * @param {number} termMonths  Loan term in whole months (> 0)
 * @returns {number} Monthly payment in £, rounded to 2 dp; 0 if inputs invalid
 */
export function calculateAmortizingMonthlyPayment(principal, annualRatePercent, termMonths) {
  const P = Number(principal);
  const n = Math.floor(Number(termMonths));
  const apr = Number(annualRatePercent);

  if (!P || P <= 0 || !n || n <= 0 || !Number.isFinite(P) || !Number.isFinite(n)) {
    return 0;
  }
  if (!Number.isFinite(apr) || apr < 0) {
    return 0;
  }

  if (apr === 0) {
    return Math.round((P / n) * 100) / 100;
  }

  const r = (apr / 100) / 12;
  const pow = (1 + r) ** n;
  const payment = (P * r * pow) / (pow - 1);
  return Math.round(payment * 100) / 100;
}

/**
 * Total interest paid over the term if all payments are made on schedule.
 */
export function calculateTotalInterest(principal, monthlyPayment, termMonths) {
  const P = Number(principal) || 0;
  const m = Number(monthlyPayment) || 0;
  const n = Math.floor(Number(termMonths)) || 0;
  if (!n || P <= 0) return 0;
  const total = m * n - P;
  return Math.round(Math.max(0, total) * 100) / 100;
}

const r2d = (n) => Math.round((n ?? 0) * 100) / 100;

/**
 * One monthly step of mortgage balance reduction (principal only pays down debt).
 * @param {number} balance
 * @param {number} annualRatePercent
 * @param {number} scheduledPayment
 * @returns {{ interest: number, principal: number, nextBalance: number }}
 */
export function calculateMortgageAmortizationStep(balance, annualRatePercent, scheduledPayment) {
  const P = Math.max(0, Number(balance) || 0);
  const pay = Math.max(0, Number(scheduledPayment) || 0);
  if (P <= 0) return { interest: 0, principal: 0, nextBalance: 0 };
  const apr = Number(annualRatePercent);
  const r = !Number.isFinite(apr) || apr === 0 ? 0 : (apr / 100) / 12;
  const interest = r === 0 ? 0 : r2d(P * r);
  const principal = r2d(Math.max(0, pay - interest));
  const nextBalance = Math.max(0, r2d(P - principal));
  return { interest, principal, nextBalance };
}
