#!/usr/bin/env bash
# List every client under clients/ with its non-secret deployment facts.
#
#   scripts/clients-list.sh          # table
#   scripts/clients-list.sh --json   # machine-readable
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
mode="${1:-table}"

node - "$root" "$mode" <<'NODE'
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const [root, mode] = process.argv.slice(2);
const dir = path.join(root, 'clients');

function parseEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let value = m[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[m[1]] = value;
  }
  return out;
}

function readMeta(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

const rows = [];
if (fs.existsSync(dir)) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;
    const base = path.join(dir, slug);
    const env = parseEnv(path.join(base, '.env'));
    const meta = readMeta(path.join(base, 'meta.json'));
    if (!meta && !Object.keys(env).length) continue;

    const remoteName = meta?.github?.remote || slug;
    const remoteCheck = spawnSync('git', ['-C', root, 'remote', 'get-url', remoteName], { encoding: 'utf8' });
    const remote = remoteCheck.status === 0 ? remoteCheck.stdout.trim() : '';

    const clean = (value) =>
      !value || /^(YOUR_|sbp_YOUR|https:\/\/YOUR_|https:\/\/pub-X+\.r2\.dev$)/.test(value) ? '' : value;

    rows.push({
      slug,
      status: meta?.status || (fs.existsSync(path.join(base, '.env')) ? 'setup' : '?'),
      domain: clean(meta?.domain || env.CLIENT_DOMAIN || ''),
      supabase: clean(meta?.supabase?.project_ref || env.SUPABASE_PROJECT_REF || ''),
      r2: clean(meta?.cloudflare?.r2_bucket || env.R2_BUCKET || ''),
      github: remote ? `${remoteName}: ${remote}` : '',
      version: meta?.deploy?.last_version || '',
      deployed: meta?.deploy?.last_deployed_at || '',
    });
  }
}
rows.sort((a, b) => a.slug.localeCompare(b.slug));

if (mode === '--json') {
  process.stdout.write(JSON.stringify(rows, null, 2) + '\n');
  process.exit(0);
}

if (!rows.length) {
  console.log('No clients yet. Create one with:');
  console.log('  scripts/new-client.sh <slug> "<store name>" <domain>');
  process.exit(0);
}

const columns = [
  ['slug', 'SLUG'],
  ['status', 'STATUS'],
  ['domain', 'DOMAIN'],
  ['supabase', 'SUPABASE REF'],
  ['r2', 'R2 BUCKET'],
  ['version', 'VERSION'],
  ['deployed', 'DEPLOYED'],
  ['github', 'GITHUB'],
];
const widths = columns.map(([key, label]) =>
  Math.max(label.length, ...rows.map((row) => String(row[key] ?? '').length))
);
const format = (values) => values.map((value, i) => String(value ?? '').padEnd(widths[i])).join('  ').trimEnd();

console.log(format(columns.map(([, label]) => label)));
console.log(format(widths.map((w) => '-'.repeat(w))));
for (const row of rows) console.log(format(columns.map(([key]) => row[key])));
console.log(`\n${rows.length} client${rows.length === 1 ? '' : 's'}. Secrets stay in clients/<slug>/.env.`);
NODE
