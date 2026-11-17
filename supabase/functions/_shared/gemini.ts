import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
export async function geminiConfig():Promise<{key:string;model:string}|null>{
 if(Deno.env.get('AI_ENABLED')==='false')return null;
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 const config=await admin.rpc('gemini_runtime_config');
 if(config.error||typeof config.data?.key!=='string'||typeof config.data?.model!=='string')return null;
 const budget=await admin.rpc('reserve_gemini_budget');if(budget.error||budget.data!==true)return null;
 return {key:Deno.env.get('GEMINI_API_KEY')||config.data.key,model:Deno.env.get('GEMINI_MODEL')||config.data.model};
}
