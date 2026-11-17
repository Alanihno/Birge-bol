import { ExpandableList } from '../components/expandable-list';
import { useNotices } from '../lib/care-api';
/* localized-copy */
import { tr, useLocale } from '../lib/i18n';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, Download, ExternalLink, Heart, LogOut, Shield, Trash2, ArrowRight } from 'lucide-react';
import { usePwa } from '../lib/pwa-context';
import { useApp } from '../lib/app-context';
import { mode, demoOnly, supabase, switchMode } from '../lib/backend';
import { repository, resetDemo } from '../lib/repository';
import { Button, Empty, ErrorState, Loading, Modal, Notice, PageHeading } from '../components/ui';
import { SpecialistCard } from '../components/specialist-card';
export function Favorites() { useLocale(); const { data } = useApp(); const { data: catalog = [], isPending, isError, refetch } = useQuery({ queryKey: ['catalog'], queryFn: () => repository.catalog() }); const favorites = catalog.filter(s => data.favorites.includes(s.id)); return <><PageHeading eyebrow={tr("ПОДДЕРЖКА ПОД РУКОЙ")} title={tr("Избранные специалисты")} description={tr("Сохранённые профили, к которым удобно вернуться.")}/>{tr(isPending ? <Loading /> : isError ? <ErrorState retry={() => void refetch()}/> : favorites.length ? <div className="specialist-grid">{tr(favorites.map(s => <SpecialistCard key={s.id} specialist={s}/>))}</div> : <Empty title={tr("Пока здесь тихо")} description={tr("Нажмите сердечко в каталоге, чтобы сохранить специалиста.")} to="/find"/>)}</>; }
export function Notifications() { useLocale(); const { userId, refresh, notify } = useApp();const notices=useNotices();const data={notifications:notices.notices}; const [busy, setBusy] = useState(false); async function markRead() { if (!userId)
    return; setBusy(true); try {
    await repository.markRead(userId);await notices.mark();
    await refresh();
}
catch {
    notify('Не удалось обновить уведомления');
}
finally {
    setBusy(false);
} } return <><PageHeading eyebrow={tr("НИЧЕГО НЕ ПОТЕРЯЕТСЯ")} title={tr("Уведомления")} action={data.notifications.length > 0 ? <Button variant="secondary" disabled={busy} onClick={() => void markRead()}>{tr("Отметить прочитанными")}</Button> : undefined}/>{tr(data.notifications.length ? <div className="stack">{tr(<ExpandableList items={[...data.notifications].sort((a,b)=>Number(a.read)-Number(b.read))} renderItem={n => <Link key={n.id} to={n.to} className={`panel notification-item ${n.read ? 'read' : ''}`}><Bell size={20}/><p>{tr(n.title)}</p>{tr(!n.read && <span className="nav-dot"/>)}<ArrowRight size={17}/></Link>} className="stack"/>)}</div> : <Empty title={tr("Вы ничего не пропустили")} description={tr("Здесь появятся записи, назначения, ответы и напоминания. Дополнительные каналы Telegram и push не обязательны.")}/>)}</>; }
export function Profile() {
    useLocale();
    const { data, userId, logout, refresh, notify } = useApp();
    const [remove, setRemove] = useState('');
    const [busy, setBusy] = useState(false);
    async function deleteChild() { if (!userId || !remove)
        return; setBusy(true); try {
        await repository.deleteChild(userId, remove);
        await refresh();
        setRemove('');
        notify('Профиль и связанные цели удалены');
    }
    catch {
        notify('Не удалось удалить профиль');
    }
    finally {
        setBusy(false);
    } }
    async function deleteReview(id: string) { if (!userId)
        return; try {
        await repository.removeReview(userId, id);
        await refresh();
    }
    catch {
        notify('Не удалось удалить отзыв');
    } }
    return <div className="narrow"><PageHeading eyebrow={tr("ВАШЕ ПРОСТРАНСТВО")} title={tr("Мой профиль")} description={tr(mode === 'demo' ? "аккаунт в этом браузере." : 'Личные данные защищаются политиками Supabase RLS.')}/><div className="panel stack"><h2>{tr("Профили детей")}</h2>{tr(data.children.map(c => <div className="profile-row" key={c.id}><div><strong>{tr(c.label)}</strong><p>{tr(c.age)}{tr("года \u00B7 ")}{tr(c.district)}</p></div><button className="icon-btn" aria-label={tr(`Удалить ${c.label}`)} onClick={() => setRemove(c.id)}><Trash2 size={18}/></button></div>))}<Link className="btn secondary" to="/onboarding?new=1">{tr("Добавить профиль")}</Link></div><div className="panel"><h2>{tr("Мои отзывы")}</h2>{tr(data.reviews.length ? data.reviews.map(r => <div className="sample-review" key={r.id}><span className="subtle-badge">{tr(r.status === 'verified' ? 'Подтверждён' : 'На модерации · посещение не подтверждено')}</span><p>{tr(r.body)}</p><Button variant="ghost" onClick={() => void deleteReview(r.id)}>{tr("Удалить мой отзыв")}</Button></div>) : <p className="muted">{tr("Отзывов пока нет. Чек-лист после занятия поможет собрать ваши наблюдения.")}</p>)}</div><Button variant="secondary" onClick={() => void logout()}><LogOut size={17}/>{tr("Выйти")}</Button><Modal open={!!remove} onOpenChange={v => { if (!v)
        setRemove(''); }} title={tr("Удалить профиль?")}><p>{tr("Связанные цели, наблюдения и ручные отметки занятий будут удалены. Действие нельзя отменить.")}</p><Button variant="danger" disabled={busy} onClick={() => void deleteChild()}>{tr("Удалить профиль")}</Button></Modal></div>;
}
export function Settings() {
    useLocale();
    const { lang, setLang, userId, logout, notify } = useApp();
    const [reset, setReset] = useState(false);
    const [deleteAccount, setDeleteAccount] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const { needRefresh: [needRefresh], offlineReady: [offlineReady], updateServiceWorker, installAvailable, installApp, installed, secure, installError, registrationError } = usePwa();
    async function eraseAccount() { setDeleting(true); try {
        const result = await supabase?.functions.invoke('account-delete', { body: { confirm: 'DELETE' } });
        if (!result || result.error)
            throw new Error();
        await logout();
        setDeleteAccount(false);
        notify('Учётная запись удалена');
    }
    catch {
        notify('Сервис удаления недоступен. Данные не удалены. См. процедуру в политике.');
    }
    finally {
        setDeleting(false);
    } }
    return <div className="narrow"><PageHeading title={tr("Настройки")} description={tr("Управляйте языком, режимом и данными.")}/><div className="panel stack"><h2>{tr("Язык интерфейса")}</h2><div className="choice-grid"><Button variant={lang === 'ru' ? 'primary' : 'secondary'} onClick={() => setLang('ru')}>{tr("Русский")}</Button><Button variant={lang === 'kk' ? 'primary' : 'secondary'} onClick={() => setLang('kk')}>{tr("Қазақша")}</Button></div><p className="tiny muted">{tr("Выберите язык интерфейса. Сообщения можно переводить отдельно.")}</p></div><div className="panel stack"><h2><Download size={20}/>{tr("Приложение под рукой")}</h2><p>{tr("Android / Chrome: установите через кнопку ниже или меню браузера. iPhone / Safari: \u00ABПоделиться\u00BB \u2192 \u00ABНа экран Домой\u00BB. В приложениях со встроенным браузером откройте страницу в Safari или Chrome.")}</p>{tr(installed ? <Notice tone="sage">{tr("Приложение уже установлено или открыто как самостоятельное приложение.")}</Notice> : !secure ? <Notice tone="peach">{tr("Для установки откройте опубликованную HTTPS-ссылку Vercel. Установка из ZIP, локального HTML-файла или HTTP-адреса в локальной сети недоступна.")}</Notice> : installAvailable ? <Button onClick={() => void installApp()}>{tr("Установить Birge Bol")}</Button> : <Notice>{tr("Кнопка появляется, когда браузер предлагает установку. Без кнопки: Chrome/Edge \u2192 меню \u2192 \u00ABУстановить приложение\u00BB; iPhone \u2192 Safari \u2192 \u00ABПоделиться\u00BB \u2192 \u00ABНа экран Домой\u00BB. Откройте сайт отдельной вкладкой, вне Telegram/Instagram и режима инкогнито. Отсутствие кнопки само по себе не означает, что PWA нельзя установить.")}</Notice>)}{tr(installError && <Notice tone="peach">{tr(installError)}</Notice>)}{tr(registrationError && <Notice tone="peach">{tr("Офлайн-модуль не загрузился. Проверьте интернет и обновите страницу на опубликованном HTTPS-адресе.")}</Notice>)}{tr(offlineReady && <p className="success-text">{tr("Оболочка приложения доступна офлайн.")}</p>)}{tr(needRefresh && <Button onClick={() => void updateServiceWorker(true)}>{tr("Есть обновление \u2014 перезагрузить")}</Button>)}</div><div className="panel stack"><h2>{tr("Режим работы")}</h2><span className="subtle-badge">{tr(mode === 'demo' ? "Локальное хранение" : 'Подключённый Supabase')}</span><p>{tr(mode === 'demo' ? "Все данные сохранены в этом браузере. Они не отправляются в Supabase." : "Каталог и личные данные загружаются из Supabase. данные не подменяют ошибки API.")}</p>{tr(!demoOnly && <Button variant="secondary" onClick={() => switchMode(mode === 'demo' ? 'supabase' : 'demo')}>{tr(mode === 'demo' ? 'Перейти к Supabase' : "Открыть локальный локальный режим")}</Button>)}{tr(mode === 'demo' && <Button variant="ghost" onClick={() => setReset(true)}>{tr("Сбросить локальные данные")}</Button>)}</div><Link className="btn secondary" to="/support">{tr("Безопасность и поддержка →")}</Link><div className="panel stack"><h2><Shield size={20}/>{tr("Данные и согласия")}</h2><Notice>{tr("Не вводите реальные сведения детей. Правовая проверка размещения данных и независимый аудит ещё не выполнены. Документы и детское аудио не загружаются.")}</Notice><Link className="text-link" to="/privacy">{tr("Конфиденциальность и удаление данных ")}<ExternalLink size={14}/></Link>{tr(userId && <><Button variant="secondary" onClick={() => void logout()}>{tr("Выйти из аккаунта")}</Button>{tr(mode === 'supabase' && <Button variant="danger" onClick={() => setDeleteAccount(true)}>{tr("Удалить учётную запись")}</Button>)}</>)}<Link className="text-link" to="/admin">{tr("Открыть модерацию")}</Link></div><div className="panel"><h2>{tr("Обратная связь")}</h2><p>{tr("Обращения сохраняются в разделе «Безопасность и поддержка». Там можно проверить статус и прочитать ответ.")}</p><Link className="text-link" to="/terms">{tr("Условия использования")}</Link></div><Modal open={reset} onOpenChange={setReset} title={tr("Сбросить данные?")}><p>{tr("Будут удалены локальные профили, записи, документы, вопросы и ответы этого локальный режима.")}</p><Button variant="danger" onClick={resetDemo}>{tr("Сбросить")}</Button></Modal><Modal open={deleteAccount} onOpenChange={setDeleteAccount} title={tr("Удалить учётную запись?")}><p>{tr("Будут удалены аккаунт и принадлежащие ему профили, вопросы, отзывы и наблюдения. Действие необратимо.")}</p><Button variant="danger" disabled={deleting} onClick={() => void eraseAccount()}>{tr("Подтвердить удаление")}</Button></Modal></div>;
}
export function Legal({ kind }: {
    kind: 'privacy' | 'terms';
}) { useLocale(); return <article className="narrow legal"><PageHeading eyebrow={tr("ЧЕРНОВИК \u00B7 НЕ УТВЕРЖДЕНО ЮРИСТОМ")} title={tr(kind === 'privacy' ? 'Конфиденциальность' : "Условия использования")}/><Notice tone="peach">{tr("Это описание текущего прототипа, а не утверждённая политика оператора. Использовать реальные сведения детей запрещено до отдельного правового и security review.")}</Notice><h2>{tr("Для чего создан Birge Bol")}</h2><p>{tr("Помочь ознакомиться с поиском поддержки и структурированием наблюдений. Приложение не ставит диагнозы, не назначает лечение, не гарантирует результат занятий или подтверждённую запись.")}</p><h2>{tr("Какие данные используются")}</h2><p>{tr("В локальном локальном режиме — профили, вопросы, цели, отзывы и избранное в localStorage этого браузера. У анкеты поиска в sessionStorage сохраняются возрастная группа, район, выбранные темы и бюджет. Имена и диагноз для поиска не нужны. Аккаунт Supabase использует email для входа; личные записи находятся в БД проекта.")}</p><h2>{tr("Сервисы и передача")}</h2>{tr(demoOnly && <Notice>{tr("Эта сборка работает только в локальном локальном режиме: Supabase, реальная авторизация и внешние интеграции отключены. записи остаются в браузере. Хостинг получает технические сведения о запросах (например, IP); при открытии карты их также получает OpenStreetMap. Аналитика и рекламные трекеры в приложение не добавлены. Не вводите настоящие персональные данные.")}</Notice>)}<p>{tr("Supabase-проект сейчас размещён в регионе ap-southeast-2. Правомерность хранения и передачи реальных персональных данных Казахстана здесь не подтверждена. Карта запрашивает публичные тайлы OpenStreetMap; провайдер получает обычные сетевые метаданные запроса. Gemini и Telegram по умолчанию отключены; словарь работает локально.")}</p><h2>{tr("Удаление и отзыв согласия")}</h2><p>{tr("профиль и его цели можно удалить в «Мой профиль». Свой вопрос удаляется в его карточке, отзыв — в профиле. Локальные данные удаляются в настройках. В подключённом режиме есть защищённое удаление аккаунта через Edge Function; резервные копии и сроки физического удаления требуют отдельной политики оператора.")}</p><h2>{tr("Ограничения и следующий этап")}</h2><p>{tr("До пилота нужно определить юридическое лицо оператора, контакт для обращений, основания обработки, сроки хранения и отзыва согласий, локализацию, договоры с обработчиками, порядок инцидентов и обращения законного представителя. Согласие в интерфейсе не заменяет эти условия.")}</p><p>{tr("Публичные вопросы и отзывы должны проходить модерацию. Проверенная оценка контакта требует доказательства посещения. Потенциальное сообщество выпускниц фонда не считается действующими пользователями платформы; партнёрство не заявляется.")}</p><Link className="btn secondary" to="/settings">{tr("Настройки и управление данными ")}<ArrowRight size={16}/></Link></article>; }
export function NotFound() { useLocale(); return <Empty title={tr("Кажется, мы свернули с пути")} description={tr("Такой страницы нет. Вернёмся туда, где можно найти поддержку.")} to="/find" label={tr("На главную")}/>; }
export function Protected({ children }: {
    children: React.ReactNode;
}) { useLocale(); const { userId, authReady } = useApp(); if (!authReady)
    return <Loading />; return userId ? <>{tr(children)}</> : <Empty title={tr("Это ваше личное пространство")} description={tr("Войдите, чтобы сохранять записи. Или попробуйте локальный аккаунт.")} to={'/auth?next=' + encodeURIComponent(location.pathname + location.search)} label={tr("Войти")}/>; }
export function DemoHint() { useLocale(); return <div className="privacy-inline"><Heart size={14}/>{tr("Только данные.")}</div>; }
