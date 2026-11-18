export function normalizeLogin(value:string){const login=value.trim().toLowerCase();if(!/^[a-z][a-z0-9_.-]{2,31}$/.test(login))throw Error('Логин: 3–32 латинские буквы, цифры, точка, дефис или подчёркивание. Начните с буквы.');return login;}
export async function sha256(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function loginEmail(value:string){return (await sha256(normalizeLogin(value))).slice(0,50)+'@accounts.birge.invalid';}
export function normalizedRecovery(value:string){return value.replace(/[\s-]/g,'').toUpperCase();}
