/**
 * Turn a snake_case identifier (backend or calculation field name) into Title Case words.
 * Fallback when no entry exists in labelMap.
 *
 * @param {string} snakeCase
 * @returns {string}
 */
export function formatLabel(snakeCase) {
  if (snakeCase == null || typeof snakeCase !== 'string') return '';
  return snakeCase
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
