import { describe, expect, it } from 'vitest';
import { verifySocialUrl } from './socialLinks';

describe('social URL verification', () => {
  it('accepts secure official links for popular networks', () => {
    expect(verifySocialUrl('Facebook', 'https://www.facebook.com/koutobi').valid).toBe(true);
    expect(verifySocialUrl('Instagram', 'https://instagram.com/koutobi').valid).toBe(true);
    expect(verifySocialUrl('TikTok', 'https://www.tiktok.com/@koutobi').valid).toBe(true);
    expect(verifySocialUrl('X', 'https://x.com/koutobi').valid).toBe(true);
    expect(verifySocialUrl('Twitter', 'https://twitter.com/koutobi').valid).toBe(true);
    expect(verifySocialUrl('YouTube', 'https://youtu.be/abc').valid).toBe(true);
  });

  it('rejects wrong domains, insecure URLs and malformed URLs', () => {
    expect(verifySocialUrl('Instagram', 'https://instagram.com.attacker.example/koutobi').valid).toBe(false);
    expect(verifySocialUrl('Facebook', 'http://facebook.com/koutobi').valid).toBe(false);
    expect(verifySocialUrl('TikTok', 'not a url').valid).toBe(false);
    expect(verifySocialUrl('YouTube', 'https://user:pass@youtube.com/channel').valid).toBe(false);
  });

  it('allows blank values and secure custom-network URLs', () => {
    expect(verifySocialUrl('Facebook', '').empty).toBe(true);
    expect(verifySocialUrl('Mastodon', 'https://social.example/@koutobi').valid).toBe(true);
  });
});
