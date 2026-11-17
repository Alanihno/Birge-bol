/* localized-copy */
import { tr, useLocale } from '../lib/i18n';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { money } from '../domain/logic';
export function BookingShortcut({ price }: {
    price: number;
}) { useLocale(); const [visible, setVisible] = useState(false); useEffect(() => { const target = document.getElementById('booking'); if (!target)
    return; const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), { rootMargin: '-70px 0px -170px 0px' }); observer.observe(target); return () => observer.disconnect(); }, []); return visible ? <div className="mobile-booking-cta"><div><small>{tr("Стоимость приёма")}</small><strong>{tr(price === 0 ? 'Бесплатно' : money(price))}</strong></div><a href="#booking" className="btn primary" aria-label={tr("Перейти к записи")}>{tr("Выбрать время")}<ArrowRight size={16}/></a></div> : null; }
