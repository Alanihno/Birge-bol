/** Display cleanup only. Database IDs, account flags and original messages are preserved. */
export function presentationCopy(text:string){
 if(text==='Вымышленный специалист · демо'||text==='Ойдан шығарылған маман · демо')return text;
 return text
  .replace(/демоданными/giu,'данными').replace(/демоданные/giu,'данные').replace(/демоданных/giu,'данных')
  .replace(/демоаккаунт/giu,'аккаунт').replace(/демопример/giu,'пример').replace(/демодокумент/giu,'документ')
  .replace(/деморежиме/giu,'локальном режиме').replace(/деморежим/giu,'локальный режим')
  .replace(/(?:Вымышленн|вымышленн|Учебн|учебн|Демонстрационн|демонстрационн)[а-яё]*\s*/gu,'')
  .replace(/(?:Презентационная версия|презентационная версия|Демоверсия|демоверсия)/gu,'')
  .replace(/\s*[·•]\s*демо(?=$|[\s.,!])/giu,'').replace(/(?<![\p{L}\p{N}_])демо(?=$|[\s.,!])/giu,'')
  .replace(/демонстрациялық\s*|ойдан шығарылған\s*|оқу мысалы\s*|демодеректер\s*|презентациялық нұсқа\s*/giu,'')
  .replace(/\s+·\s*·/g,' ·').replace(/^\s*·\s*|\s*·\s*$/g,'').trim();
}
