import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
const publicRoutes=new Set(['/','/privacy','/terms','/cookies','/review-rules','/consent']);
export function PageMetadata(){const {pathname}=useLocation();useEffect(()=>{let robots=document.querySelector<HTMLMetaElement>('meta[name="robots"]');if(!robots){robots=document.createElement('meta');robots.name='robots';document.head.append(robots);}robots.content=publicRoutes.has(pathname)?'index,follow':'noindex,nofollow';},[pathname]);return null;}
