import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { APP_VERSION } from './version';

const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));

describe('APP_VERSION (docs/versioning.md)', () => {
  it('is MAJOR.MINOR.PATCH', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('matches package.json so the UI identifies the deployed release', () => {
    expect(APP_VERSION).toBe(pkg.version);
  });
});
