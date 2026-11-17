import { supabase } from './backend';
export async function resolveMaterialMedia(path:string|null|undefined,token?:string):Promise<string|undefined>{
 if(!path)return undefined;
 if(/^\/(video|materials)\/[a-zA-Z0-9._/-]+$/.test(path))return path;
 if(!path.startsWith('storage:')||!supabase)return undefined;
 if(token){const {data,error}=await supabase.functions.invoke('care-media',{body:{token,path}});if(error)throw Error('Материал временно недоступен');return data?.url;}
 const {data,error}=await supabase.storage.from('care-materials').createSignedUrl(path.slice(8),60);if(error)throw Error('Нет доступа к файлу материала');return data.signedUrl;
}
