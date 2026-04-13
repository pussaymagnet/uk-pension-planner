/**
 * All Supabase access for budget_* tables. UI layers should import from here only.
 */
import { supabase } from '../../../lib/supabase';
import { SECTION_FIXED, SECTION_NICE } from '../domain/expenditures';

const r2 = (n) => Math.round((n ?? 0) * 100) / 100;

export function fetchBudgetDataBundle(userId) {
  return Promise.all([
    supabase
      .from('budget_expenditures')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('budget_debts')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('budget_savings')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('budget_credit_cards')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('budget_settings')
      .select('unexpected_spending_buffer')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('budget_goal_savings')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true }),
  ]);
}

export async function upsertExpenditureRow(userId, entry, sortOrder) {
  await supabase.from('budget_expenditures').upsert(
    {
      id: entry.id,
      user_id: userId,
      name: entry.name,
      amount: entry.amount,
      partner1_pct: entry.partner1Pct,
      section: entry.section === SECTION_NICE ? SECTION_NICE : SECTION_FIXED,
      sort_order: sortOrder,
    },
    { onConflict: 'id' },
  );
}

export async function deleteExpenditureRow(id) {
  await supabase.from('budget_expenditures').delete().eq('id', id);
}

export async function upsertDebtRow(userId, entry, sortOrder) {
  await supabase.from('budget_debts').upsert(
    {
      id: entry.id,
      user_id: userId,
      name: entry.name,
      principal: entry.principal,
      annual_rate_pct: entry.annualRatePct,
      term_months: entry.termMonths,
      sort_order: sortOrder,
    },
    { onConflict: 'id' },
  );
}

export async function deleteDebtRow(id) {
  await supabase.from('budget_debts').delete().eq('id', id);
}

export async function upsertSavingRow(userId, entry, sortOrder) {
  await supabase.from('budget_savings').upsert(
    {
      id: entry.id,
      user_id: userId,
      name: entry.name,
      amount: entry.amount,
      sort_order: sortOrder,
    },
    { onConflict: 'id' },
  );
}

export async function deleteSavingRow(id) {
  await supabase.from('budget_savings').delete().eq('id', id);
}

export async function upsertCreditCardRow(userId, entry, sortOrder) {
  await supabase.from('budget_credit_cards').upsert(
    {
      id: entry.id,
      user_id: userId,
      name: entry.name,
      total_balance: entry.totalBalance,
      minimum_monthly_payment: entry.minimumMonthlyPayment,
      apr_pct: entry.apr != null ? entry.apr : null,
      notes: entry.notes || null,
      sort_order: sortOrder,
    },
    { onConflict: 'id' },
  );
}

export async function deleteCreditCardRow(id) {
  await supabase.from('budget_credit_cards').delete().eq('id', id);
}

export async function upsertGoalSavingRow(userId, entry, sortOrder) {
  await supabase.from('budget_goal_savings').upsert(
    {
      id: entry.id,
      user_id: userId,
      name: entry.name,
      target_amount: entry.targetAmount,
      current_saved_amount: entry.currentSavedAmount,
      chosen_monthly_contribution: entry.chosenMonthlyContribution,
      committed: Boolean(entry.committed),
      committed_monthly_contribution: r2(entry.committedMonthlyContribution ?? 0),
      sort_order: sortOrder,
    },
    { onConflict: 'id' },
  );
}

export async function deleteGoalSavingRow(id) {
  await supabase.from('budget_goal_savings').delete().eq('id', id);
}

export async function upsertUnexpectedBuffer(userId, unexpectedSpendingBuffer) {
  await supabase.from('budget_settings').upsert(
    {
      user_id: userId,
      unexpected_spending_buffer: unexpectedSpendingBuffer,
    },
    { onConflict: 'user_id' },
  );
}
