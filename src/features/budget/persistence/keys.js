/**
 * Budget feature–internal row/offline keys (stable for existing users).
 * Cross-tab derived data: use `plannedMonthlyOutgoings.js` (`readBudgetMirror`, selectors) — do not read these keys outside Budget + adapter.
 */
export const STORAGE_KEY = 'pension-planner-budget';
export const STORAGE_KEY_DEBTS = 'pension-planner-budget-debts';
export const STORAGE_KEY_SAVINGS = 'pension-planner-budget-savings';
export const STORAGE_KEY_CREDIT_CARDS = 'pension-planner-budget-credit-cards';
export const STORAGE_KEY_UNEXPECTED_BUFFER = 'pension-planner-budget-unexpected-buffer';
export const STORAGE_KEY_GOAL_SAVINGS = 'pension-planner-budget-goal-savings';
