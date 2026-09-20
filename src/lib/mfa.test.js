import { describe, expect, it, vi } from 'vitest';
import {
  challengeFactor,
  enrollTotpFactor,
  getAllTotpFactors,
  getVerifiedTotpFactor,
  unenrollFactor,
  verifyFactorCode,
} from './mfa';

function mockClient({ totp = [], enrollData = null, enrollError = null, challengeData = null, verifyData = null, verifyError = null, unenrollError = null } = {}) {
  return {
    auth: {
      mfa: {
        listFactors: vi.fn(async () => ({ data: { totp, phone: [] }, error: null })),
        enroll: vi.fn(async () => ({ data: enrollData, error: enrollError })),
        challenge: vi.fn(async () => ({ data: challengeData, error: null })),
        verify: vi.fn(async () => ({ data: verifyData, error: verifyError })),
        unenroll: vi.fn(async () => ({ data: {}, error: unenrollError })),
      },
    },
  };
}

describe('getVerifiedTotpFactor', () => {
  it('returns the verified factor, ignoring unverified ones', async () => {
    const client = mockClient({
      totp: [
        { id: 'unver', status: 'unverified' },
        { id: 'good', status: 'verified' },
      ],
    });
    expect(await getVerifiedTotpFactor(client)).toMatchObject({ id: 'good' });
  });

  it('returns null when nothing is verified', async () => {
    const client = mockClient({ totp: [{ id: 'x', status: 'unverified' }] });
    expect(await getVerifiedTotpFactor(client)).toBeNull();
    expect(await getVerifiedTotpFactor(mockClient())).toBeNull();
  });

  it('throws list errors to the caller', async () => {
    const client = mockClient();
    client.auth.mfa.listFactors.mockResolvedValueOnce({ data: null, error: new Error('nope') });
    await expect(getVerifiedTotpFactor(client)).rejects.toThrow('nope');
  });
});

describe('getAllTotpFactors', () => {
  it('returns every totp factor', async () => {
    const client = mockClient({ totp: [{ id: 'a' }, { id: 'b' }] });
    expect(await getAllTotpFactors(client)).toHaveLength(2);
  });
});

describe('enroll + challenge + verify + unenroll', () => {
  it('enrolls and returns qr payload', async () => {
    const client = mockClient({ enrollData: { id: 'f1', totp: { qr_code: '<svg/>', secret: 'ABC' } } });
    const data = await enrollTotpFactor(client);
    expect(data.id).toBe('f1');
    expect(client.auth.mfa.enroll).toHaveBeenCalledWith({ factorType: 'totp', friendlyName: 'admin-authenticator' });
  });

  it('surfaces enroll errors', async () => {
    const client = mockClient({ enrollData: null, enrollError: new Error('mfa disabled') });
    await expect(enrollTotpFactor(client)).rejects.toThrow('mfa disabled');
  });

  it('challenges with the factor id', async () => {
    const client = mockClient({ challengeData: { id: 'ch1' } });
    expect(await challengeFactor(client, 'f1')).toEqual({ id: 'ch1' });
    expect(client.auth.mfa.challenge).toHaveBeenCalledWith({ factorId: 'f1' });
  });

  it('verifies a trimmed 6-digit code', async () => {
    const client = mockClient({ verifyData: { session: { a: 1 } } });
    await verifyFactorCode(client, { factorId: 'f', challengeId: 'c', code: ' 123456 ' });
    expect(client.auth.mfa.verify).toHaveBeenCalledWith({ factorId: 'f', challengeId: 'c', code: '123456' });
  });

  it('rejects malformed codes before any network call', async () => {
    const client = mockClient({ verifyData: {} });
    await expect(verifyFactorCode(client, { factorId: 'f', challengeId: 'c', code: '12' })).rejects.toThrow('6 أرقام');
    await expect(verifyFactorCode(client, { factorId: 'f', challengeId: 'c', code: 'abcdef' })).rejects.toThrow('6 أرقام');
    expect(client.auth.mfa.verify).not.toHaveBeenCalled();
  });

  it('surfaces verify errors (e.g. expired challenge)', async () => {
    const client = mockClient({ verifyData: null, verifyError: new Error('invalid code') });
    await expect(verifyFactorCode(client, { factorId: 'f', challengeId: 'c', code: '123456' })).rejects.toThrow('invalid code');
  });

  it('unenrolls by factor id', async () => {
    const client = mockClient();
    await unenrollFactor(client, 'f1');
    expect(client.auth.mfa.unenroll).toHaveBeenCalledWith({ factorId: 'f1' });
  });
});
