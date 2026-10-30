import { describe, expect, it } from 'vitest';
import { APP_VERSION } from './version';
import { CHANGE_TYPES, CHANGELOG } from './changelog';

const asNumber = (version) => {
  const [major, minor, patch] = version.split('.').map(Number);
  return major * 10000 + minor * 100 + patch;
};

describe('changelog data', () => {
  it('documents the running version', () => {
    expect(CHANGELOG.some((entry) => entry.version === APP_VERSION)).toBe(true);
  });

  it('lists each version once, newest first', () => {
    const versions = CHANGELOG.map((entry) => entry.version);
    expect(new Set(versions).size).toBe(versions.length);
    for (let i = 1; i < versions.length; i += 1) {
      expect(asNumber(versions[i - 1])).toBeGreaterThan(asNumber(versions[i]));
    }
  });

  it('has complete, well-typed entries', () => {
    for (const entry of CHANGELOG) {
      expect(entry.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(entry.date))).toBe(false);
      expect(CHANGE_TYPES[entry.type]).toBeTruthy();
      expect(entry.title.trim().length).toBeGreaterThan(0);
      expect(entry.changes.length).toBeGreaterThan(0);
      for (const change of entry.changes) {
        expect(change.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
