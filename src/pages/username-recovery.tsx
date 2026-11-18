import {useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {useLocale,tr} from '../lib/i18n';
import {useApp} from '../lib/app-context';
import {accountAccess} from '../lib/account-access';
import {Button} from '../components/ui';
import {RecoveryCode} from '../components/recovery-code';
export default function UsernameRecovery(){
 useLocale();const app=useApp(),[params]=useSearchParams(),rotate=params.get('rotate')==='1';
 const [login,setLogin]=useState(''),[code,setCode]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[replacement,setReplacement]=useState('');
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{const result=await accountAccess({action:rotate?'rotate':'recover',login,password,recovery_code:code});setReplacement(result.recovery_code);setCode('');setPassword('');}catch(e){setError(e instanceof Error?e.message:'Не удалось восстановить доступ');}finally{setBusy(false);}}
 return <main className="narrow auth-recovery stack"><h1>{tr(rotate?'Новый резервный код':'Восстановление доступа')}</h1>{replacement?<RecoveryCode code={replacement} onContinue={()=>location.assign(app.userId?'/settings':'/auth')}/>:<><form className="panel stack" onSubmit={e=>void submit(e)}><p>{tr(rotate?'Введите логин и текущий пароль. Новый код заменит прежний.':'Введите резервный код, выданный при регистрации. После смены пароля старый код перестанет работать.')}</p><label>{tr('Логин')}<input required autoComplete="username" maxLength={32} value={login} onChange={e=>setLogin(e.target.value)}/></label>{!rotate&&<label>{tr('Резервный код')}<input required type="password" autoComplete="off" data-private="true" maxLength={100} value={code} onChange={e=>setCode(e.target.value)}/></label>}<label>{tr(rotate?'Текущий пароль':'Новый пароль')}<input required type="password" autoComplete={rotate?'current-password':'new-password'} minLength={rotate?8:12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/></label><Button busy={busy}>{tr(rotate?'Получить новый код':'Изменить пароль')}</Button>{error&&<p role="alert" className="error">{tr(error)}</p>}</form><Link to={rotate?'/auth/restore':'/auth/restore?rotate=1'} onClick={()=>{setCode('');setPassword('');setError('');}}>{tr(rotate?'Восстановить забытый пароль':'Я помню пароль, нужен новый резервный код')}</Link><Link to="/auth">{tr('Вернуться ко входу')}</Link><Link to="/auth/recovery">{tr('Восстановить существующий email-аккаунт')}</Link></>}</main>;
}
