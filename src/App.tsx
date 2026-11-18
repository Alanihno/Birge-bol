import { PageMetadata } from './components/page-metadata';
import { CookieBanner } from './components/cookie-banner';
import { Mascot } from './components/mascot/Mascot';
import { LegalDocument } from './pages/legal-documents';
import { AuthRecovery } from './pages/auth-recovery';
const MascotGallery=lazy(()=>import('./pages/mascot-gallery'));
const UsernameRecovery=lazy(()=>import('./pages/username-recovery'));
import {isModuleLoadError,recoverModuleLoad} from './lib/update-safety';
/* localized-copy */
import { tr, useLocale } from './lib/i18n';
import { Component, lazy, Suspense } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { Layout } from './components/layout';
import { Loading, Button, ErrorState } from './components/ui';
import { Welcome, Onboarding, Auth } from './pages/start';
import { Moms, Ask, QuestionPage } from './pages/community';
import { Notifications, Settings, NotFound } from './pages/other';
import { useApp } from './lib/app-context';
import { roleHome } from './domain/care';
import type { Role } from './domain/care';
import Landing from './pages/landing';
const FamilyTask=lazy(()=>import('./pages/diary').then(m=>({default:m.FamilyTask})));
import { configError } from './lib/backend';
const Payments=lazy(()=>import('./pages/payments'));
const Team = lazy(() => import('./pages/team'));
const Support = lazy(() => import('./pages/support'));
const CheckIn = lazy(() => import('./pages/check-in'));
const DataMap = lazy(() => import('./pages/data-map'));
const Pro = lazy(() => import('./pages/pro'));
const Clinics = lazy(() => import('./pages/clinics'));
const Clinic = lazy(() => import('./pages/clinic'));
const Diary = lazy(() => import('./pages/diary'));
const Compare = lazy(() => import('./pages/compare'));
const Child = lazy(() => import('./pages/child'));
const Find = lazy(() => import('./pages/find'));
const Specialist = lazy(() => import('./pages/specialist'));
const Account = lazy(() => import('./pages/account'));
const Home = lazy(() => import('./pages/home'));
const Feedback = lazy(() => import('./pages/feedback'));
const Explain = lazy(() => import('./pages/explain'));
const Admin = lazy(() => import('./pages/admin'));
export class AppBoundary extends Component<{
    children: ReactNode;
}, {
    failed: boolean;
}> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(error: Error, _info: ErrorInfo) { if(isModuleLoadError(error))recoverModuleLoad(); }
    render() { return this.state.failed ? <div className="fatal"><Mascot state="error" size="large"/><h1>{tr("Не удалось открыть страницу")}</h1><p>{tr("Попробуйте перезагрузить приложение. Ваши серверные записи останутся в аккаунте.")}</p><Button onClick={() => location.reload()}>{tr("Перезагрузить")}</Button></div> : this.props.children; }
}
function Gate({children,roles}:{children:ReactNode;roles?:Role[]}) {const app=useApp();if(app.authError)return <div className="narrow"><p className="muted">{tr(app.authError)}</p><ErrorState retry={app.retryAuth}/><Button variant="secondary" onClick={()=>void app.logout()}>{tr("Войти в другой аккаунт")}</Button></div>;if(!app.authReady)return <Loading/>;if(!app.userId)return <Navigate to={'/auth?next='+encodeURIComponent(location.pathname+location.search)} replace/>;if(roles&&!roles.includes(app.role))return <Navigate to={roleHome(app.role)} replace/>;return <>{tr(children)}</>;}
function VisitLink(){const {compact,code}=useParams();const id=compact?.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/,'$1-$2-$3-$4-$5');return <Navigate replace to={'/diary?appointment='+id+'&code='+code}/>;}
const parent=(children:ReactNode)=><Gate roles={['parent']}>{tr(children)}</Gate>;
export default function App() {useLocale();if(configError)return <div className="fatal"><h1>{tr("Нужна настройка подключения")}</h1><p>{tr("Укажите настройки Supabase или VITE_APP_MODE=demo.")}</p></div>;return <AppBoundary><BrowserRouter><PageMetadata/><CookieBanner/><Suspense fallback={<Loading/>}><Routes>
<Route index element={<Landing/>}/><Route path="family/:token" element={<FamilyTask/>}/>
<Route path="auth/restore" element={<UsernameRecovery/>}/><Route path="auth/recovery" element={<AuthRecovery/>}/><Route path="auth/confirm" element={<AuthRecovery confirm/>}/><Route path="auth" element={<Auth key="login"/>}/><Route path="register" element={<Auth key="register"/>}/><Route path="login" element={<Navigate to="/auth" replace/>}/>
<Route element={<Layout/>}>
<Route path="mascot-gallery" element={<Gate><MascotGallery/></Gate>}/><Route path="data-map" element={<Gate><DataMap/></Gate>}/>
<Route path="v/:compact/:code" element={parent(<VisitLink/>)}/><Route path="welcome" element={<Welcome/>}/>
<Route path="check-in" element={parent(<CheckIn/>)}/><Route path="check-in/:code" element={parent(<CheckIn/>)}/><Route path="app" element={parent(<Home/>)}/><Route path="onboarding" element={parent(<Onboarding/>)}/>
<Route path="find" element={parent(<Find/>)}/><Route path="specialists/:id" element={<Gate roles={['parent','specialist']}><Specialist/></Gate>}/><Route path="compare" element={parent(<Compare/>)}/>
<Route path="moms" element={parent(<Moms/>)}/><Route path="moms/ask" element={parent(<Ask/>)}/><Route path="moms/questions/:id" element={parent(<QuestionPage/>)}/>
<Route path="child/team" element={parent(<Team/>)}/><Route path="pro/team/:id" element={<Gate roles={['specialist']}><Team/></Gate>}/><Route path="child" element={parent(<Child/>)}/><Route path="child/goals" element={parent(<Child/>)}/><Route path="child/recordings" element={parent(<Child/>)}/><Route path="diary" element={parent(<Diary/>)}/>
<Route path="feedback/:sessionId" element={parent(<Feedback/>)}/><Route path="explain" element={<Gate><Explain/></Gate>}/><Route path="favorites" element={parent(<Find/>)}/><Route path="profile" element={parent(<Account/>)}/>
{tr(['pro','pro/requests','pro/kids','pro/kids/:id','pro/tasks','pro/profile'].map(path=><Route key={path} path={path} element={<Gate roles={['specialist']}><Pro/></Gate>}/>))}
<Route path="clinics/:id" element={<Gate roles={['parent','specialist','clinic']}><Clinics/></Gate>}/><Route path="clinics" element={<Gate roles={['parent','specialist','clinic']}><Clinics/></Gate>}/><Route path="workspace" element={<Navigate to="/pro" replace/>}/><Route path="clinic" element={<Gate roles={['clinic']}><Clinic/></Gate>}/>
<Route path="payments" element={parent(<Payments/>)}/><Route path="notifications" element={<Gate><Notifications/></Gate>}/><Route path="support" element={<Gate><Support/></Gate>}/><Route path="settings" element={<Gate><Settings/></Gate>}/><Route path="admin" element={<Gate roles={['admin','moderator']}><Admin/></Gate>}/>
<Route path="cookies" element={<LegalDocument kind="cookies"/>}/><Route path="review-rules" element={<LegalDocument kind="reviews"/>}/><Route path="consent" element={<LegalDocument kind="consent"/>}/><Route path="privacy" element={<LegalDocument kind="privacy"/>}/><Route path="terms" element={<LegalDocument kind="terms"/>}/><Route path="*" element={<NotFound/>}/>
</Route></Routes></Suspense></BrowserRouter></AppBoundary>;}
