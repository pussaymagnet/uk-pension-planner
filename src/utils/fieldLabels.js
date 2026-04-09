import { labelMap } from '../constants/labelMap';
import { formatLabel } from './formatLabel';

export { formatLabel };

/**
 * Convert React state key (camelCase) to API / DB style snake_case.
 * @param {string} camelKey
 * @returns {string}
 */
export function camelToSnake(camelKey) {
  if (!camelKey || typeof camelKey !== 'string') return '';
  return camelKey.replace(/([A-Z])/g, (_, c) => `_${c.toLowerCase()}`).replace(/^_/, '');
}

/**
 * Display label for any snake_case key (backend column or calculation field).
 * @param {string} key
 * @returns {string}
 */
export function getLabel(key) {
  if (key == null || key === '') return '';
  const k = String(key);
  if (Object.prototype.hasOwnProperty.call(labelMap, k)) return labelMap[k];
  return formatLabel(k);
}

/**
 * Label for a React state field on inputs — uses the same name as persisted keys.
 * @param {string} camelCaseStateKey e.g. 'grossSalary', 'employeeValue'
 * @returns {string}
 */
export function getFieldLabel(camelCaseStateKey) {
  return getLabel(camelToSnake(camelCaseStateKey));
}

/**
 * "/month" or "/year" for breakdown rows.
 * @param {'annual'|'monthly'} displayPeriod
 * @returns {string}
 */
export function periodSlashSuffix(displayPeriod) {
  return displayPeriod === 'monthly' ? getLabel('slash_month') : getLabel('slash_year');
}
