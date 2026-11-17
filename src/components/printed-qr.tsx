import { useState } from 'react';
import { useApp } from '../lib/app-context';
import { careCommand } from '../lib/care-api';
import { qrDataUrl } from '../lib/qr';
import { Button, Modal, Notice } from './ui';
import { tr, useLocale } from '../lib/i18n';
export function PrintedQr() {
    useLocale(); const app = useApp();
    const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [code, setCode] = useState(''), [image, setImage] = useState(''), [error, setError] = useState(''), [rotate, setRotate] = useState(false);
    async function load(replace = false) {
        if (!app.userId) return;
        setBusy(true); setError('');
        try { const data = await careCommand(app.userId, 'specialist_qr', { rotate: replace }); const value = String(data.code); setCode(value); setImage(await qrDataUrl(location.origin + '/check-in/' + value)); setRotate(false); }
        catch (error) { setError(error instanceof Error ? error.message : 'Не удалось открыть QR'); }
        finally { setBusy(false); }
    }
    return <><Button variant="secondary" onClick={() => { setOpen(true); void load(); }}>{tr('Мой QR для посещений')}</Button><Modal open={open} onOpenChange={setOpen} title={tr('Постоянный QR специалиста')}><div className="stack center">
        <p>{tr('Распечатайте и разместите QR в центре. Он остаётся прежним, пока вы сами его не замените.')}</p>
        {tr(image && <img src={image} width={240} height={240} alt={tr('Постоянный QR для подтверждения посещения')}/>)}
        {tr(image && <a className="btn primary" href={image} download="birge-bol-visit-qr.svg">{tr('Скачать QR для печати')}</a>)}
        {tr(code && <label>{tr('Ссылка из QR')}<input readOnly value={location.origin + '/check-in/' + code}/></label>)}
        <Notice>{tr('Родитель отмечается из своего аккаунта: за 30 минут до приёма и до 2 часов после окончания. QR не заменяет проверку записи на сервере.')}</Notice>
        <Button variant="ghost" disabled={busy} onClick={() => setRotate(!rotate)}>{tr('Заменить QR')}</Button>
        {tr(rotate && <><p>{tr('Старый плакат перестанет работать. После замены нужно распечатать новый QR.')}</p><Button busy={busy} onClick={() => void load(true)}>{tr('Подтвердить замену QR')}</Button></>)}
        {tr(busy && <p role="status">{tr('Загрузка…')}</p>)}{tr(error && <p className="error" role="alert">{tr(error)}</p>)}
    </div></Modal></>;
}
