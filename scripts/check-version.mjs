#!/usr/bin/env node
/**
 * Release version guard — docs/versioning.md.
 *
 * `src/lib/version.js` is what the UI renders; `package.json` is what tooling
 * and humans read. They must always agree, otherwise the version shown on the
 * site stops identifying the deployed release.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEMVER = /^\d+\.\d+\.\d+$/;

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const versionSrc = readFileSync(join(root, 'src/lib/version.js'), 'utf8');
const match = versionSrc.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);

console.log('== check-version ==');

const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
};

if (!match) fail('APP_VERSION not found in src/lib/version.js');
const appVersion = match[1];

if (!SEMVER.test(appVersion)) fail(`APP_VERSION "${appVersion}" is not MAJOR.MINOR.PATCH`);
if (!SEMVER.test(pkg.version)) fail(`package.json version "${pkg.version}" is not MAJOR.MINOR.PATCH`);

if (appVersion !== pkg.version) {
  fail(
    `version mismatch — src/lib/version.js has "${appVersion}", ` +
      `package.json has "${pkg.version}". Set both to the same value (docs/versioning.md).`
  );
}

console.log(`OK  v${appVersion}`);
