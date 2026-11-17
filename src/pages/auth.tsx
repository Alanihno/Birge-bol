import { assertPasswordSafe } from '../lib/password-security';
import { safeError } from '../lib/safe-error';
import { saveConsent } from '../lib/consents';
import { tr, useLocale } from '../lib/i18n';
import { useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight, Heart, ShieldCheck, Stethoscope, Building2 } from 'lucide-react';
import { Logo } from '../components/layout';
import { useApp } from '../lib/app-context';
import { mode, supabase } from '../lib/backend';
import { demoAccounts, demoPassword, roleHome } from '../domain/care';
import type { Role } from '../domain/care';
import { Button, Loading, Notice, PageHeading } from '../components/ui';

export default function Auth() {
    useLocale();
    const app = useApp();
    const [params] = useSearchParams();
    const location = useLocation();
    const initial = params.get('role');
    const registration = location.pathname === '/register' || params.get('intent') === 'signup';
    const [role, setRole] = useState<Role | null>(['parent', 'specialist', 'clinic'].includes(initial || '') ? initial as Role : null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [signup, setSignup] = useState(registration);
    const [consent, setConsent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [entering, setEntering] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const next = params.get('next') || sessionStorage.getItem('bb-auth-next');
    const safe = next?.startsWith('/') && !next.startsWith('//') && !/^\/(auth|register|login)([/?#]|$)/.test(next) ? next : null;
    const destination = app.role === 'parent' ? safe || roleHome(app.role) : roleHome(app.role);

    async function quick(selected: Role) {
        setError('');
        setBusy(true);
        try {
            const account = demoAccounts.find(a => a.role === selected)!;
            if (mode === 'demo') app.demoLogin(selected, account.email);
            else {
                const result = await supabase!.auth.signInWithPassword({ email: account.email, password: demoPassword });
                if (result.error) throw result.error;
            }
            setEntering(true);
        } catch (e) {
            setError(safeError(e));
        } finally {
            setBusy(false);
        }
    }

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        if (!role || !supabase) return;
        setBusy(true);
        setError('');
        setMessage('');
        try {
            sessionStorage.setItem('bb-signup-role', role);
            localStorage.setItem('bb-signup-role', role);
            if (signup) {
                if (!consent) throw Error('Подтвердите условия');await assertPasswordSafe(password);
                const afterSignup = role === 'parent' ? '/onboarding' : roleHome(role);
                sessionStorage.setItem('bb-auth-next', afterSignup);
                const result = await supabase.auth.signUp({
                    email: email.trim(), password,
                    options: { emailRedirectTo: window.location.origin + '/auth/confirm?next=' + encodeURIComponent(afterSignup) },
                });
                if (result.error) throw result.error;
                if (result.data.session) { await saveConsent(result.data.user!.id); setEntering(true); }
                else {sessionStorage.setItem('bb-confirm-email',email.trim());window.location.assign('/auth/confirm');}
            } else {
                const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
                if (result.error) throw result.error;
                setEntering(true);
            }
        } catch (e) {
            setError(safeError(e));
        } finally {
            setBusy(false);
        }
    }

    if (app.authReady && app.userId && entering) return <Navigate replace to={destination}/>;

    return <div className="public-auth">
        <a className="skip-link" href="#auth-main">{tr('К содержимому')}</a>
        <header className="public-auth-header"><Logo/><div className="language">
            <button className={app.lang === 'ru' ? 'selected' : ''} onClick={() => app.setLang('ru')}>{tr("РУС")}</button>
            <button className={app.lang === 'kk' ? 'selected' : ''} onClick={() => app.setLang('kk')}>{tr("ҚАЗ")}</button>
        </div></header>
        <main id="auth-main" className="auth-page">
            <Link className="back" to="/">{tr('← О проекте')}</Link>
            {tr(!app.authReady ? <Loading/> : app.userId ? <section className="panel stack">
                <PageHeading title={tr('Вы уже вошли')} description={tr('Открыть свой кабинет или войти в другой аккаунт?')}/>
                <Link className="btn primary" to={destination}>{tr('В кабинет')}<ArrowRight size={17}/></Link>
                <Button variant="secondary" onClick={() => void app.logout()}>{tr('Войти в другой аккаунт')}</Button>
            </section> : <>
                <PageHeading eyebrow={tr('ВАШЕ ЛИЧНОЕ ПРОСТРАНСТВО')} title={tr(role ? 'Хорошо, что вы здесь' : 'Давайте познакомимся')} description={tr('Выберите роль, чтобы открыть своё пространство Birge Bol.')}/>
                <div className="role-choices">{tr([
                    { role: 'parent' as Role, title: 'Я родитель', text: 'Найти поддержку для ребёнка', icon: Heart },
                    { role: 'specialist' as Role, title: 'Я специалист', text: 'Записи, дети и назначения', icon: Stethoscope },
                    { role: 'clinic' as Role, title: 'Представляю клинику', text: 'Расписание и команда', icon: Building2 },
                ].map(({ role: selected, title, text, icon: Icon }) => <button key={selected} className={`panel role-choice ${role === selected ? 'selected' : ''}`} aria-pressed={role === selected} onClick={() => { setRole(selected); setError(''); setMessage(''); }}><Icon/><strong>{tr(title)}</strong><small>{tr(text)}</small></button>))}</div>
                {tr(role === 'specialist' && <Notice>{tr('После регистрации специалист проходит модерацию. До проверки профиль не появится в выдаче.')}</Notice>)}
                {tr(mode === 'supabase' && role && <form className="panel stack" onSubmit={event => void submit(event)}>
                    <Link to="/auth/recovery" className="text-link">{tr("Забыли пароль?")}</Link><div className="child-tabs"><button type="button" className={!signup ? 'active' : ''} onClick={() => { setSignup(false); setError(''); setMessage(''); }}>{tr('Вход')}</button><button type="button" className={signup ? 'active' : ''} onClick={() => { setSignup(true); setError(''); setMessage(''); }}>{tr('Регистрация')}</button></div>
                    <label>Email<input required type="email" autoComplete="email" value={email} maxLength={254} onChange={event => setEmail(event.target.value)}/></label>
                    <label>{tr('Пароль')}<input required type="password" minLength={signup?12:8} maxLength={128} disabled={busy} autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)}/></label>
                    {tr(signup && <label className="checkbox"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} required/>{tr("Согласен с условиями платформы и обработкой email.")}<Link to="/privacy">{tr('Подробнее')}</Link></label>)}
                    <Button busy={busy} disabled={signup && !consent}>{tr(signup ? 'Создать аккаунт' : 'Войти')}<ArrowRight size={17}/></Button>
                </form>)}
                <p className="auth-alternative">{tr(signup ? 'Уже есть аккаунт?' : 'Впервые в Birge Bol?')} <Link to={(signup ? '/auth' : '/register') + (role ? '?role=' + role : '')}>{tr(signup ? 'Войти' : 'Зарегистрироваться')}</Link></p>
                {(mode==='demo'||import.meta.env.VITE_ENABLE_DEMO_ACCOUNTS==='true')&&<details className="panel auth-demo" open={mode === 'demo'}><summary>{tr("Быстрый вход")}<ShieldCheck size={20}/></summary>
                    <p className="muted">{tr("Выберите аккаунт для быстрого входа.")}{tr(mode === 'demo' ? 'Данные хранятся в этом браузере.' : 'Тестовые аккаунты используют существующую базу Supabase.')}</p>
                    <div className="demo-accounts">{tr(demoAccounts.filter(account => !role || account.role === role).map(account => <Button key={account.role} busy={busy} variant="secondary" onClick={() => void quick(account.role)}><span>{tr(account.label)}<small>{tr(account.email)}</small></span><ArrowRight size={17}/></Button>))}</div>
                </details>}
                {tr(message && <Notice>{tr(message)}</Notice>)}{tr(error && <p className="error" role="alert">{tr(error)}</p>)}
            </>)}
        </main>
        <footer className="public-auth-footer"><Link to="/privacy">{tr('Конфиденциальность')}</Link><Link to="/terms">{tr('Условия')}</Link></footer>
    </div>;
}
