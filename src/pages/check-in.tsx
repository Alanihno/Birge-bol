import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp } from '../lib/app-context';
import { useCareActions, timeLabel } from '../components/care-ui';
import { Button, PageHeading, Notice } from '../components/ui';
import { tr, useLocale } from '../lib/i18n';
type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorConstructor = new (options: { formats: string[] }) => Detector;
type Choice = { id: string; starts_at: string; service: string; child: string };
export function parseVisitQr(value: string): string | null {
    const trimmed = value.trim();
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuid.test(trimmed)) return trimmed;
    try { const url = new URL(trimmed); if (!([location.origin, 'https://birge-bol.vercel.app', 'https://birge-bol-alans-projects-f2e926b6.vercel.app'].includes(url.origin)) || !/^https?:$/.test(url.protocol)) return null; const match = url.pathname.match(/^\/check-in\/([^/]+)\/?$/); return match && uuid.test(match[1]) ? match[1] : null; } catch { return null; }
}
export default function CheckIn() {
    useLocale(); const app = useApp(), actions = useCareActions(), params = useParams();
    const [input, setInput] = useState(params.code || ''), [camera, setCamera] = useState(false), [error, setError] = useState(''), [choices, setChoices] = useState<Choice[]>([]), [selected, setSelected] = useState(''), [done, setDone] = useState<{ id: string; at: string } | null>(null);
    const video = useRef<HTMLVideoElement>(null), stream = useRef<MediaStream | null>(null);
    useEffect(() => {
        if (!camera) return;
        let alive = true, timer: ReturnType<typeof setTimeout>;
        const stop = () => { stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; };
        void (async () => {
            try {
                const Constructor = (window as Window & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
                if (!Constructor) throw Error('В этом браузере встроенное распознавание QR недоступно. Откройте обычную камеру телефона, отсканируйте плакат и перейдите по ссылке — откроется эта же страница подтверждения.');
                const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
                if (!alive) { media.getTracks().forEach(track => track.stop()); return; }
                stream.current = media; if (!video.current) { stop(); return; } video.current.srcObject = media; await video.current.play();
                const detector = new Constructor({ formats: ['qr_code'] });
                const scan = async () => {
                    if (!alive || !video.current) return;
                    try { const codes = await detector.detect(video.current); const value = codes.map(code => parseVisitQr(code.rawValue)).find(Boolean); if (value) { setInput(value); setCamera(false); await confirm(value); return; } } catch { /* Retry after a frame is ready. */ }
                    if (alive) timer = setTimeout(() => void scan(), 250);
                };
                await scan();
            } catch (error) { if (alive) { setError(error instanceof Error ? error.message : 'Не удалось открыть камеру. Разрешите доступ или откройте ссылку из QR.'); setCamera(false); } stop(); }
        })();
        return () => { alive = false; clearTimeout(timer); stop(); };
    }, [camera]);
    async function confirm(scanned?: string) {
        const code = parseVisitQr(scanned || input); if (!code) { setError('Вставьте ссылку из QR Birge Bol или отсканируйте код'); return; }
        setError('');
        const result = await actions.run('confirm_qr', { code, appointment_id: selected || null }, '');
        if (result?.choose) { setChoices(result.appointments as Choice[]); return; }
        if (result?.id) { setDone({ id: String(result.id), at: String(result.visited_at) }); setCamera(false); }
    }
    return <div className="narrow"><PageHeading title={tr(done ? 'Посещение подтверждено' : 'Сканировать QR')} description={tr('Отметьтесь у специалиста и оставьте отзыв о своём опыте.')}/>{tr(done ? <section className="panel stack"><strong>{tr('Посещено')} · {tr(timeLabel(done.at))}</strong><Link className="btn primary" to={'/feedback/' + done.id}>{tr('Оставить отзыв')}</Link><Link to="/diary">{tr('Мои приёмы')}</Link></section> : <section className="panel stack">
        <Notice>{tr('Нужна подтверждённая запись к этому специалисту. Допустимое время: за 30 минут до начала и до 2 часов после окончания приёма.')}</Notice>
        <Button variant="secondary" onClick={() => { setError(''); setCamera(!camera); }}>{tr(camera ? 'Закрыть камеру' : 'Сканировать QR камерой')}</Button>
        {tr(camera && <video ref={video} muted playsInline aria-label={tr('Камера сканера QR')}/>)}
        <label>{tr('Ссылка или код с плаката')}<input value={input} maxLength={200} onChange={event => { setInput(event.target.value); setChoices([]); setSelected(''); }}/></label>
        {tr(choices.length > 0 && <label>{tr('Выберите запись')}<select value={selected} onChange={event => setSelected(event.target.value)}><option value="">{tr('Выберите приём')}</option>{tr(choices.map(choice => <option key={choice.id} value={choice.id}>{tr(choice.child)} · {tr(timeLabel(choice.starts_at))}</option>))}</select></label>)}
        <Button busy={actions.busy} disabled={!input.trim() || choices.length > 0 && !selected || !app.userId} onClick={() => void confirm()}>{tr('Подтвердить посещение')}</Button>
        {tr((error || actions.error) && <p className="error" role="alert">{tr(error || actions.error)}</p>)}
    </section>)}</div>;
}
