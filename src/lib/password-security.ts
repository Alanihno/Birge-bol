export const PASSWORD_MIN_LENGTH=12;
export function passwordStrengthError(password:string):string|null {
 if(password.length<PASSWORD_MIN_LENGTH)return 'Пароль должен содержать не менее 12 символов.';
 if(password.length>128)return 'Пароль должен содержать не более 128 символов.';
 if(/^(.)\1+$/.test(password)||/^(?:password|qwerty|123456|пароль)/i.test(password))return 'Выберите более надёжный пароль: случайную фразу или пароль из менеджера паролей.';
 return null;
}
/** SHA-1 is only the public range lookup format; Auth still stores passwords using bcrypt.
 * This never sends the password, full hash, email, identity, or suffix to the range provider.
 * Form-level defence; server-side Supabase HIBP requires Pro and remains a separate launch gate.
 */
export async function assertPasswordSafe(password:string,request:typeof fetch=fetch):Promise<void>{
 const strength=passwordStrengthError(password);if(strength)throw Error(strength);
 const digest=await crypto.subtle.digest('SHA-1',new TextEncoder().encode(password));
 const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('').toUpperCase();
 let response:Response;
 try{response=await request('https://api.pwnedpasswords.com/range/'+hash.slice(0,5),{method:'GET',headers:{'Add-Padding':'true'},credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',signal:AbortSignal.timeout(8000)});}catch{throw Error('Проверка безопасности пароля временно недоступна. Попробуйте ещё раз.');}
 if(!response.ok)throw Error('Проверка безопасности пароля временно недоступна. Попробуйте ещё раз.');
 const text=await response.text();if(text.length>300000||!text.trim()||!text.trim().split(/\r?\n/).every(line=>/^[A-F0-9]{35}:\d+$/.test(line)))throw Error('Проверка безопасности пароля временно недоступна. Попробуйте ещё раз.');
 const found=text.split(/\r?\n/).find(line=>line.startsWith(hash.slice(5)+':'));
 if(found&&Number(found.split(':')[1])>0)throw Error('Этот пароль встречается в известных утечках. Выберите другой, уникальный пароль.');
}
