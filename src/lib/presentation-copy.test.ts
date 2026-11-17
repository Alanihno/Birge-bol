import { expect, it } from 'vitest';
import { presentationCopy } from './presentation-copy';
it('keeps demo provenance and consent warnings visible in both languages',()=>{for(const text of ['Вымышленный специалист · демо','Учебный материал, не медицинское назначение','Демонстрациялық деректер','Демо-пример: оплата вне приложения'])expect(presentationCopy(text)).toBe(text);});
