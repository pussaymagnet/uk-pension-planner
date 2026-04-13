#!/usr/bin/env node
/**
 * Create a new manual SQL script under supabase/budget/ or supabase/pension/
 * and register it in supabase/sql-manifest.json (status: pending).
 *
 * Usage:
 *   npm run sql:new -- --tab budget --name my_feature
 *   npm run sql:new -- --tab pension --name extra_column
 *
 * Files:
 *   budget  -> supabase/budget/budget_<slug>.sql
 *   pension -> supabase/pension/pension_inputs_<slug>.sql
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const manifestPath = path.join(root, 'supabase', 'sql-manifest.json');

function parseArgs(argv) {
  const out = { tab: null, name: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--tab' && argv[i + 1]) {
      out.tab = argv[++i];
    } else if (argv[i] === '--name' && argv[i + 1]) {
      out.name = argv[++i];
    }
  }
  return out;
}

function slugify(raw) {
  const s = String(raw)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!s) {
    console.error('Invalid --name: use letters, numbers, or underscores.');
    process.exit(1);
  }
  return s;
}

const { tab, name } = parseArgs(process.argv.slice(2));
if (!tab || !['budget', 'pension'].includes(tab)) {
  console.error('Usage: npm run sql:new -- --tab budget|pension --name <slug>');
  process.exit(1);
}
if (!name) {
  console.error('Missing --name');
  process.exit(1);
}

const slug = slugify(name);
const fileName = tab === 'budget' ? `budget_${slug}.sql` : `pension_inputs_${slug}.sql`;
const relPath = `${tab}/${fileName}`;
const absDir = path.join(root, 'supabase', tab);
const absFile = path.join(absDir, fileName);

fs.mkdirSync(absDir, { recursive: true });

if (fs.existsSync(absFile)) {
  console.error(`File already exists: ${relPath}`);
  process.exit(1);
}

const header = `-- Manual SQL for Supabase (run once in Dashboard SQL Editor)
-- Domain: ${tab === 'budget' ? 'Household Budget' : 'Pension inputs'}
-- Registered in supabase/sql-manifest.json (npm run sql:new)
-- After running on your project, set status to "applied" in the manifest.

`;

fs.writeFileSync(absFile, header, 'utf8');
console.log(`Created ${relPath}`);

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const paths = new Set(manifest.scripts.map((s) => s.path));
if (paths.has(relPath)) {
  console.error('Manifest already lists this path; file was created but manifest not updated.');
  process.exit(1);
}

manifest.scripts.push({
  path: relPath,
  status: 'pending',
  note: '',
});

manifest.scripts.sort((a, b) => a.path.localeCompare(b.path));
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Updated supabase/sql-manifest.json (${relPath} → pending)`);
