/* localized-copy */
import { tr, useLocale } from '../lib/i18n';
import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
export function ScrollTop() { useLocale(); const [visible, setVisible] = useState(false); useEffect(() => { const onScroll = () => setVisible(window.scrollY > 700); onScroll(); window.addEventListener('scroll', onScroll, { passive: true }); return () => window.removeEventListener('scroll', onScroll); }, []); return visible ? <button className="scroll-top" aria-label={tr("Вернуться наверх")} onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })}><ArrowUp size={19}/></button> : null; }
