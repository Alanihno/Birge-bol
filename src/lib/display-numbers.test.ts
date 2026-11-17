import {describe,it,expect} from 'vitest';
import {formatExperience,formatReviews} from './display-numbers';
describe('Russian count labels',()=>{
 it('declines years and keeps a visible separator',()=>{expect(formatExperience(4,'ru')).toBe('Стаж: 4 года');expect(formatExperience(5,'ru')).toBe('Стаж: 5 лет');expect(formatExperience(21,'ru')).toBe('Стаж: 21 год');});
 it('declines review counts',()=>{expect(formatReviews(1,'ru')).toBe('1 подтверждённый отзыв');expect(formatReviews(2,'ru')).toBe('2 подтверждённых отзыва');expect(formatReviews(38,'ru')).toBe('38 подтверждённых отзывов');expect(formatReviews(38,'kk')).toBe('38 расталған пікір');});
});
