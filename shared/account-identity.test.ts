import {describe,it,expect} from 'vitest';
import {loginEmail,normalizeLogin,normalizedRecovery} from './account-identity';
describe('username authentication identity',()=>{
 it('keeps the internal namespace separate from real email addresses',async()=>{expect(await loginEmail('  Amina_2026 ')).toBe(await loginEmail('amina_2026'));expect(await loginEmail('amina_2026')).toMatch(/^[a-f0-9]{50}@accounts\.birge\.invalid$/);expect(()=>normalizeLogin('victim@example.com')).toThrow();expect(()=>normalizeLogin('a')).toThrow();expect(()=>normalizeLogin('../admin')).toThrow();});
 it('accepts a copied recovery code while preserving the complete random value',()=>{expect(normalizedRecovery(' bb-ab12 cd34-ef56 ')).toBe('BBAB12CD34EF56');});
});
