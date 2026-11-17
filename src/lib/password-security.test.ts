import { describe, expect, it, vi } from 'vitest';
import { assertPasswordSafe, passwordStrengthError } from './password-security';
describe('password security on application forms',()=>{
 it('rejects short and predictable passwords before any network request',async()=>{const request=vi.fn();await expect(assertPasswordSafe('123456',request)).rejects.toThrow('12');expect(request).not.toHaveBeenCalled();expect(passwordStrengthError('password123456789')).toContain('надёжный');});
 it('sends only five SHA-1 prefix characters and no password, full hash or credentials',async()=>{
  const password='Long unique test phrase 942!';const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1',new TextEncoder().encode(password))),b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
  const request=vi.fn().mockResolvedValue(new Response('A'.repeat(35)+':0\r\n'));
  await assertPasswordSafe(password,request);const [url,options]=request.mock.calls[0];expect(url).toBe('https://api.pwnedpasswords.com/range/'+hash.slice(0,5));expect(JSON.stringify(request.mock.calls)).not.toContain(password);expect(JSON.stringify(request.mock.calls)).not.toContain(hash);expect(options.credentials).toBe('omit');expect(options.body).toBeUndefined();expect(options.headers['Add-Padding']).toBe('true');
 });
 it('blocks a leaked password and refuses to claim success when the provider is unavailable',async()=>{
  const password='A synthetic long phrase 487!';const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1',new TextEncoder().encode(password))),b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
  await expect(assertPasswordSafe(password,vi.fn().mockResolvedValue(new Response(hash.slice(5)+':123')))).rejects.toThrow('утечках');
  await expect(assertPasswordSafe(password,vi.fn().mockResolvedValue(new Response('bad gateway',{status:503})))).rejects.toThrow('недоступна');
  await expect(assertPasswordSafe(password,vi.fn().mockResolvedValue(new Response('unexpected body')))).rejects.toThrow('недоступна');
 });
});
