import { BudgetProvider } from './hooks/BudgetProvider';

/**
 * Standalone monthly budget module — only receives `netMonthlyIncome` and `user` from the app shell.
 */
export default function BudgetFeature(props) {
  return <BudgetProvider {...props} />;
}
