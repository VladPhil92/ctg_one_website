import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationPath = path.join(root, 'supabase/migrations/0013_beer_style_master_and_lot_codes.sql');

if (!fs.existsSync(migrationPath)) {
  throw new Error('0013 beer style master migration is missing');
}

const sql = fs.readFileSync(migrationPath, 'utf8');

const requiredFragments = [
  'create table if not exists public.investment_beer_styles',
  "('GOLD', 'golden-pale-ale', 'Golden Pale Ale', 24)",
  "('IRA', 'irish-red-ale', 'Irish Red Ale', 24)",
  "('POR', 'porter', 'Porter', 24)",
  "('HEF', 'oktoberfest-hefeweizen', 'Oktoberfest Hefeweizen', 24)",
  'add column if not exists beer_style_id uuid references public.investment_beer_styles(id)',
  'create or replace function public.create_production_lot_from_style',
  "public.has_investment_permission('production.manage')",
  'pg_advisory_xact_lock',
  "'CTG-' || v_style.code || '-' || v_year::text || '-'",
  'total_eligible_units',
  'p_total_cases',
];

for (const fragment of requiredFragments) {
  if (!sql.includes(fragment)) {
    throw new Error(`0013 invariant missing: ${fragment}`);
  }
}

if (/standard_(?:production|label|own_point|b2b).*not null/i.test(sql)) {
  throw new Error('Style-level economic presets must remain nullable until approved business values exist');
}

if (!/unique\s+check\s*\(code\s*=\s*upper\(code\)/i.test(sql)) {
  throw new Error('Beer style code must remain unique and uppercase constrained');
}

console.log('Beer master-data invariants: OK');
