#!/usr/bin/env node
/**
 * Ensure every .sql file under supabase/budget/, pension/, net_worth/, projection/
 * appears in supabase/sql-manifest.json, and every manifest path exists on disk.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const supabaseRoot = path.join(root, 'supabase');
const manifestPath = path.join(supabaseRoot, 'sql-manifest.json');

function collectSqlFiles(dir, base = dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      out.push(...collectSqlFiles(full, base));
    } else if (name.endsWith('.sql')) {
      out.push(path.relative(supabaseRoot, full).split(path.sep).join('/'));
    }
  }
  return out;
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const manifestPaths = new Set(manifest.scripts.map((s) => s.path));

const onDisk = [
  ...collectSqlFiles(path.join(supabaseRoot, 'budget')),
  ...collectSqlFiles(path.join(supabaseRoot, 'pension')),
  ...collectSqlFiles(path.join(supabaseRoot, 'net_worth')),
  ...collectSqlFiles(path.join(supabaseRoot, 'projection')),
].sort();

const missingInManifest = onDisk.filter((p) => !manifestPaths.has(p));
const orphanManifest = [...manifestPaths].filter((p) => {
  const abs = path.join(supabaseRoot, ...p.split('/'));
  return !fs.existsSync(abs);
});

let failed = false;
if (missingInManifest.length) {
  failed = true;
  console.error('SQL files on disk but not in sql-manifest.json:');
  for (const p of missingInManifest) console.error(`  - ${p}`);
}
if (orphanManifest.length) {
  failed = true;
  console.error('Manifest paths with no file on disk:');
  for (const p of orphanManifest) console.error(`  - ${p}`);
}

if (failed) {
  process.exit(1);
}
console.log(`OK: ${onDisk.length} SQL file(s) match sql-manifest.json.`);
