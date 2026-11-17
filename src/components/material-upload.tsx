import { canonicalYouTube, youtubeId } from '../lib/youtube';
import { SafeVideo } from './safe-video';
/* localized-copy */
import { tr, useLocale } from '../lib/i18n';
import { useState } from 'react';
import { supabase } from '../lib/backend';
import { useApp } from '../lib/app-context';
export function MaterialUpload({ name, label }: {
    name: string;
    label: string;
}) { useLocale(); const { userId } = useApp(), [path, setPath] = useState(''), [youtube,setYoutube]=useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''); async function upload(file: File) { if (!supabase || !userId)
    return; setBusy(true); setError(''); try {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['webm', 'mp4', 'pdf', 'png', 'jpg', 'jpeg', 'vtt'].includes(ext) || file.size > 50 * 1024 * 1024)
        throw Error('Допустимы WebM, MP4, PDF, PNG, JPEG, VTT до 50 МБ');
    if (name === 'video') {
        const video = document.createElement('video'), url = URL.createObjectURL(file);
        try {
            const duration = await new Promise<number>((resolve, reject) => { video.onloadedmetadata = () => resolve(video.duration); video.onerror = () => reject(Error('Не удалось прочитать видео')); video.src = url; });
            if (duration < 30 || duration > 90)
                throw Error('Продолжительность видео должна быть от 30 до 90 секунд');
        }
        finally {
            URL.revokeObjectURL(url);
        }
    }
    const object = userId + '/' + crypto.randomUUID() + '.' + ext;
    const r = await supabase.storage.from('care-materials').upload(object, file, { contentType: ext === 'vtt' ? 'text/vtt' : file.type, upsert: false });
    if (r.error)
        throw Error(r.error.message);
    setPath('storage:' + r.data.path);
}
catch (e) {
    setError(e instanceof Error ? e.message : 'Не удалось загрузить файл');
}
finally {
    setBusy(false);
} } return <div className="stack"><label>{tr(label)}<input type="file" disabled={busy || !supabase} accept={name === 'video' ? 'video/mp4,video/webm' : name === 'memo' ? 'application/pdf,image/png,image/jpeg' : '.vtt'} onChange={e => { const file = e.target.files?.[0]; if (file)
    void upload(file); }}/></label>{name==='video'&&<><label>{tr("Или ссылка YouTube")}<input type="url" value={youtube} maxLength={2048} placeholder="https://www.youtube.com/watch?v=…" onChange={e=>setYoutube(e.target.value)} pattern="https://.*"/></label>{youtube&&!youtubeId(youtube)&&<p className="error" role="alert">{tr("Укажите корректную ссылку YouTube, youtu.be или Shorts")}</p>}{youtubeId(youtube)&&<SafeVideo url={youtube}/>}</>}<input name={name} type="hidden" value={name==='video'&&youtube?canonicalYouTube(youtube)||'invalid-youtube-url':path}/>{tr(busy && <small role="status">{tr("Загружаем в защищённое хранилище…")}</small>)}{tr(path && <small>{tr("Файл загружен. Доступ ограничен назначением и модерацией.")}</small>)}{tr(!supabase && <small>{tr("В автономном  используется готовый технический материал.")}</small>)}{tr(error && <p className="error" role="alert">{tr(error)}</p>)}</div>; }
