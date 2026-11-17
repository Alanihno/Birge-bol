/** Conservative display cleanup. Never remove demo, consent, provenance or safety labels. */
export function presentationCopy(text:string){
 return text
  .replace(/локальном локальном/giu,'локальном')
  .replace(/\s+·\s*·/g,' ·').replace(/^\s*·\s*|\s*·\s*$/g,'').trim();
}
