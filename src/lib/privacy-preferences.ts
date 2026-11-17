export type CookieChoice={version:1;necessary:true;analytics:boolean;media:boolean;updatedAt:string};
const key='bb-cookie-consent-v1';
export function cookieChoice():CookieChoice|null {try{const value=JSON.parse(localStorage.getItem(key)||'null');return value?.version===1&&value.necessary===true?value:null;}catch{return null;}}
export function saveCookieChoice(analytics:boolean,media:boolean) {localStorage.setItem(key,JSON.stringify({version:1,necessary:true,analytics,media,updatedAt:new Date().toISOString()}));window.dispatchEvent(new Event('bb-cookie-choice'));}
export function openCookieSettings(){window.dispatchEvent(new Event('bb-cookie-settings'));}
