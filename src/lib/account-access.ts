import {supabase} from './backend';
export {loginEmail,normalizeLogin} from '../../shared/account-identity';
export async function accountAccess(body:Record<string,unknown>):Promise<{recovery_code:string}>{
 if(!supabase)throw Error('Нет подключения к базе');const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);let result;try{result=await supabase.functions.invoke('account-access',{body,signal:controller.signal});}finally{clearTimeout(timer);}const {data,error}=result;
 if(error){let message='Сервис временно недоступен. Повторите позже.';try{const response=(error as {context?:Response}).context;if(response){const result=await response.json();if(typeof result.error==='string')message=result.error;}}catch{/* Keep safe fallback. */}throw Error(message);}
 if(!data?.recovery_code)throw Error('Не удалось завершить действие');return data;
}
